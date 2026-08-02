from __future__ import annotations

import ast
import hashlib
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location(
    "cortexel_nest_example_visualization_oracle",
    ROOT / "scripts/generate-nest-example-visualization-oracle.py",
)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError("cannot load the NEST visualization oracle generator")
oracle = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(oracle)


RASTER_HELPER = b"""
def _make_plot(
    ts,
    ts1,
    node_ids,
    neurons,
    hist=True,
    hist_binwidth=5.0,
    grayscale=False,
    title=None,
    xlabel=None,
):
    num_neurons = len(numpy.unique(neurons))
    n = values
    heights = 1000 * n / (hist_binwidth * num_neurons)
"""

SPATIAL_HELPER = b"""
def _draw_extent(ax):
    ax.set(aspect="equal")

def PlotLayer(ax):
    if len(ext) == 2:
        ax.scatter([], [])
        _draw_extent(ax)

def PlotTargets(ax):
    if len(ext) == 2:
        ax.scatter([], [])
        _draw_extent(ax)

def PlotSources(ax):
    if len(ext) == 2:
        ax.scatter([], [])
        _draw_extent(ax)

def PlotProbabilityParameter(ax, z):
    ax.imshow(np.minimum(np.maximum(z, 0.0), 1.0))
    _create_mask_patches()
"""

HH_RESPONSE = """
n_data = int(dcto / float(dcstep))
amplitudes = np.zeros(n_data)
event_freqs = np.zeros(n_data)
for i, amp in enumerate(range(dcfrom, dcto, dcstep)):
    n_events = sr.n_events
    amplitudes[i] = amp
    event_freqs[i] = n_events / (simtime / 1000.0)
plt.plot(amplitudes, event_freqs)
"""

INTRINSIC_DUAL_AXIS = """
fig = plt.figure()
Vax = fig.add_subplot(111)
Vax.plot(t, voltage)
Vax.set_ylabel("Voltageinf [mV]")
Iax = Vax.twinx()
Iax.plot(t, current)
Iax.set_ylabel("Current [pA]")
"""

IF_CURVE_COMPLETE = """
class IF_curve:
    n_neurons = 100
    t_sim = 1000.0

    def build(self):
        self.neuron = nest.Create(self.model, self.n_neurons, self.params)
        self.noise = nest.Create("noise_generator")
        self.spike_recorder = nest.Create("spike_recorder")

    def connect(self):
        nest.Connect(self.noise, self.neuron, "all_to_all")
        nest.Connect(self.neuron, self.spike_recorder, "all_to_all")

    def output_rate(self, mean, std):
        self.build()
        self.connect()
        nest.Simulate(self.t_sim)
        rate = self.spike_recorder.n_events * 1000.0 / (1.0 * self.n_neurons * self.t_sim)
        return rate

    def compute_transfer(self, i_mean=(1, 2, 1), i_std=(1, 2, 1)):
        self.i_range = numpy.arange(*i_mean)
        self.std_range = numpy.arange(*i_std)
        self.rate = numpy.zeros((self.i_range.size, self.std_range.size))
        for n, i in enumerate(self.i_range):
            for m, std in enumerate(self.std_range):
                self.rate[n, m] = self.output_rate(i, std)

transfer = IF_curve(model, params)
transfer.compute_transfer()
with shelve.open(model + "_transfer.dat") as dat:
    dat["I_mean"] = transfer.i_range
    dat["I_std"] = transfer.std_range
    dat["rate"] = transfer.rate
"""

OUTPUT_TRAJECTORY = """
n_out = 2
readout_signal = events_mm_out["readout_signal"]
target_signal = events_mm_out["target_signal"]
readout_signal = readout_signal.reshape((n_out, n_iter, batch_size, steps["sequence"]))
target_signal = target_signal.reshape((n_out, n_iter, batch_size, steps["sequence"]))
ax.plot(readout_signal[0, -1, 0, :], -readout_signal[1, -1, 0, :], label="readout")
ax.plot(target_signal[0, -1, 0, :], -target_signal[1, -1, 0, :], label="target")
ax.axis("equal")
"""

SPATIAL_2D_CALLSITE = """
pos = nest.spatial.grid(shape=[4, 3], extent=[2.0, 1.5])
layer = nest.Create("iaf_psc_alpha", positions=pos)
nest.PlotTargets(layer[0], layer)
"""


def sha256(payload: bytes) -> str:
    return "sha256:" + hashlib.sha256(payload).hexdigest()


class NestVisualizationOracleAstTest(unittest.TestCase):
    def _helper_root(
        self,
        root: Path,
        raster: bytes = RASTER_HELPER,
        spatial: bytes = SPATIAL_HELPER,
    ) -> tuple[tuple[str, str], tuple[str, str]]:
        raster_path = root / "pynest/nest/raster_plot.py"
        spatial_path = root / "pynest/nest/lib/hl_api_spatial.py"
        raster_path.parent.mkdir(parents=True)
        spatial_path.parent.mkdir(parents=True)
        raster_path.write_bytes(raster)
        spatial_path.write_bytes(spatial)
        return (
            ("pynest/nest/raster_plot.py", sha256(raster)),
            ("pynest/nest/lib/hl_api_spatial.py", sha256(spatial)),
        )

    def _verify_helpers(self, raster: bytes, spatial: bytes) -> list[dict[str, object]]:
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            authorities = self._helper_root(root, raster, spatial)
            with patch.object(oracle, "HELPER_AUTHORITIES", authorities):
                return oracle._verify_helper_semantics(root)

    def test_exact_helper_semantics_accept_the_reviewed_shapes(self) -> None:
        records = self._verify_helpers(RASTER_HELPER, SPATIAL_HELPER)
        self.assertEqual(len(records), 2)
        self.assertEqual(
            records[0]["verifiedSemantics"]["senderDenominator"],
            "len(numpy.unique(neurons))",
        )
        self.assertEqual(records[1]["verifiedSemantics"]["extentAspect"], "equal_xy")

    def test_helper_semantic_mutations_fail_after_repinning_the_fixture_hash(self) -> None:
        mutations = (
            (
                RASTER_HELPER.replace(b"hist=True", b"hist=False"),
                SPATIAL_HELPER,
                "defaults to a 5 ms histogram",
            ),
            (
                RASTER_HELPER.replace(b"numpy.unique(neurons)", b"numpy.unique(node_ids)"),
                SPATIAL_HELPER,
                "active-sender denominator expression drifted",
            ),
            (
                RASTER_HELPER.replace(b"1000 * n", b"100 * n"),
                SPATIAL_HELPER,
                "active-sender rate expression drifted",
            ),
            (
                RASTER_HELPER,
                SPATIAL_HELPER.replace(
                    b"def PlotTargets(ax):\n    if len(ext) == 2:\n        ax.scatter([], [])",
                    b"def PlotTargets(ax):\n    if len(ext) == 2:\n        ax.scatter([], [])\n        ax.plot([], [])",
                ),
                "unexpected endpoint-connecting line operation",
            ),
            (
                RASTER_HELPER,
                SPATIAL_HELPER.replace(b"np.maximum(z, 0.0)", b"np.maximum(z, -1.0)"),
                "probability clamp is not exactly",
            ),
            (
                RASTER_HELPER,
                SPATIAL_HELPER.replace(b'aspect="equal"', b'aspect="auto"'),
                "no longer fixes equal x/y aspect",
            ),
            (
                RASTER_HELPER,
                SPATIAL_HELPER.replace(
                    b"def PlotSources(ax):\n    if len(ext) == 2:\n        ax.scatter([], [])\n        _draw_extent(ax)",
                    b"def PlotSources(ax):\n    if len(ext) == 2:\n        ax.scatter([], [])",
                ),
                "exact 2D equal-aspect _draw_extent call chain drifted",
            ),
            (
                RASTER_HELPER,
                SPATIAL_HELPER.replace(b"if len(ext) == 2:", b"if len(ext) == 3:", 1),
                "not confined to the exact 2D branch",
            ),
            (
                RASTER_HELPER,
                SPATIAL_HELPER.replace(
                    b"if len(ext) == 2:\n        ax.scatter([], [])\n        _draw_extent(ax)",
                    b"if len(ext) == 2:\n        ax.scatter([], [])\n    else:\n        _draw_extent(ax)",
                    1,
                ),
                "not confined to the exact 2D branch",
            ),
        )
        for raster, spatial, message in mutations:
            with self.subTest(message=message):
                with self.assertRaisesRegex(oracle.OracleError, message):
                    self._verify_helpers(raster, spatial)

    def test_raster_call_profile_requires_the_enabled_bounded_histogram_branch(self) -> None:
        valid = ast.parse(
            "nest.raster_plot.from_device(sr, hist=True, hist_binwidth=100.0)"
        )
        call = oracle._calls(valid)[0]
        self.assertEqual(
            oracle._raster_call_profile("example.py", call),
            {
                "lineAnchor": 1,
                "histogramArgument": "literal_true",
                "histogramBinWidthMsLiteralValue": "100.0",
            },
        )
        defaulted = oracle._calls(ast.parse("nest.raster_plot.from_device(sr)"))[0]
        self.assertEqual(
            oracle._raster_call_profile("example.py", defaulted)["histogramArgument"],
            "helper_default_true",
        )

        rejected = (
            "nest.raster_plot.from_device(sr, hist=False)",
            "nest.raster_plot.from_device(sr, hist=enabled)",
            "nest.raster_plot.from_device(sr, hist_binwidth=0)",
            "nest.raster_plot.from_device(sr, hist_binwidth=-1.0)",
            "nest.raster_plot.from_device(sr, hist_binwidth=float('nan'))",
            "nest.raster_plot.from_device(sr, **kwargs)",
        )
        for source in rejected:
            with self.subTest(source=source):
                candidate = oracle._calls(ast.parse(source))[0]
                with self.assertRaises(oracle.OracleError):
                    oracle._raster_call_profile("example.py", candidate)

    def test_hh_response_curve_shape_binds_both_carriers_and_axes(self) -> None:
        oracle._verify_hh_response_curve_shape(ast.parse(HH_RESPONSE))
        for mutation in (
            HH_RESPONSE.replace(
                "plt.plot(amplitudes, event_freqs)",
                "plt.plot(event_freqs, amplitudes)",
            ),
            HH_RESPONSE.replace("amplitudes[i] = amp", "amplitudes[i] = i"),
            HH_RESPONSE.replace(
                "n_events / (simtime / 1000.0)",
                "n_events / simtime",
            ),
        ):
            with self.subTest(mutation=mutation):
                with self.assertRaises(oracle.OracleError):
                    oracle._verify_hh_response_curve_shape(ast.parse(mutation))

    def test_intrinsic_shape_is_one_base_panel_with_one_derived_twin_axis(self) -> None:
        oracle._verify_intrinsic_single_panel_dual_axis_shape(
            ast.parse(INTRINSIC_DUAL_AXIS)
        )
        for mutation in (
            INTRINSIC_DUAL_AXIS.replace("fig.add_subplot(111)", "fig.add_subplot(211)"),
            INTRINSIC_DUAL_AXIS + "\nother_fig, other_axis = plt.subplots()\n",
            INTRINSIC_DUAL_AXIS.replace("Vax.twinx()", "Vax.twiny()"),
            INTRINSIC_DUAL_AXIS.replace("Current [pA]", "Voltage [mV]"),
        ):
            with self.subTest(mutation=mutation):
                with self.assertRaises(oracle.OracleError):
                    oracle._verify_intrinsic_single_panel_dual_axis_shape(ast.parse(mutation))

    def test_if_curve_binds_complete_recorder_grid_and_retained_carriers(self) -> None:
        profile = oracle._verify_if_curve_complete_population_shape(
            ast.parse(IF_CURVE_COMPLETE)
        )
        self.assertEqual(
            profile["populationConnection"],
            "nest.Connect(self.neuron,self.spike_recorder,all_to_all)",
        )
        mutations = (
            IF_CURVE_COMPLETE.replace(
                'nest.Connect(self.neuron, self.spike_recorder, "all_to_all")',
                'nest.Connect(self.neuron, self.spike_recorder, "one_to_one")',
            ),
            IF_CURVE_COMPLETE.replace(
                "numpy.zeros((self.i_range.size, self.std_range.size))",
                "numpy.zeros(self.i_range.size)",
            ),
            IF_CURVE_COMPLETE.replace(
                "self.output_rate(i, std)",
                "self.output_rate(std, i)",
            ),
            IF_CURVE_COMPLETE.replace(
                'dat["rate"] = transfer.rate',
                'dat["rate"] = transfer.i_range',
            ),
            IF_CURVE_COMPLETE.replace(
                "        self.build()\n        self.connect()",
                "        self.connect()\n        self.build()",
            ),
            IF_CURVE_COMPLETE.replace("        return rate", "        return 0"),
            IF_CURVE_COMPLETE.replace(
                "        self.build()\n        self.connect()",
                "        if False:\n            self.build()\n        self.connect()",
            ),
            IF_CURVE_COMPLETE.replace(
                "                self.rate[n, m] = self.output_rate(i, std)",
                "                if False:\n                    self.rate[n, m] = self.output_rate(i, std)",
            ),
            IF_CURVE_COMPLETE.replace(
                '        self.spike_recorder = nest.Create("spike_recorder")',
                '        self.spike_recorder = nest.Create("spike_recorder")\n'
                "        self.spike_recorder = other",
            ),
            IF_CURVE_COMPLETE.replace(
                '        self.spike_recorder = nest.Create("spike_recorder")',
                '        self.spike_recorder = nest.Create("spike_recorder")\n'
                "        (self.spike_recorder,) = (other,)",
            ),
            IF_CURVE_COMPLETE.replace(
                "        self.connect()\n        nest.Simulate(self.t_sim)",
                "        self.connect()\n"
                "        self.spike_recorder = other\n"
                "        nest.Simulate(self.t_sim)",
            ),
            IF_CURVE_COMPLETE.replace(
                '        nest.Connect(self.neuron, self.spike_recorder, "all_to_all")',
                '        if False:\n            nest.Connect(self.neuron, self.spike_recorder, "all_to_all")',
            ),
            IF_CURVE_COMPLETE.replace(
                "transfer.compute_transfer()",
                "if False:\n    transfer.compute_transfer()",
            ),
            IF_CURVE_COMPLETE.replace(
                "                self.rate[n, m] = self.output_rate(i, std)",
                "                self.rate[n, m] = self.output_rate(i, std)\n"
                "                self.rate[0, 0] = -1",
            ),
            IF_CURVE_COMPLETE.replace(
                "transfer.compute_transfer()",
                "transfer.compute_transfer()\ntransfer.rate = forged",
            ),
            IF_CURVE_COMPLETE.replace(
                "transfer.compute_transfer()",
                "transfer.compute_transfer()\nsaved = transfer\nsaved.rate = forged",
            ),
        )
        for mutation in mutations:
            with self.subTest(mutation=mutation):
                with self.assertRaises(oracle.OracleError):
                    oracle._verify_if_curve_complete_population_shape(ast.parse(mutation))

    def test_trajectory_binds_readout_target_coordinates_and_equal_scale(self) -> None:
        profile = oracle._verify_output_coordinate_trajectory_shape(
            ast.parse(OUTPUT_TRAJECTORY)
        )
        self.assertEqual(profile["dimension"], 2)
        for mutation in (
            OUTPUT_TRAJECTORY.replace("n_out = 2", "n_out = 3"),
            OUTPUT_TRAJECTORY.replace(
                "-readout_signal[1, -1, 0, :]",
                "-readout_signal[0, -1, 0, :]",
            ),
            OUTPUT_TRAJECTORY.replace('label="target"', 'label="state"'),
            OUTPUT_TRAJECTORY.replace('ax.axis("equal")', 'ax.axis("auto")'),
        ):
            with self.subTest(mutation=mutation):
                with self.assertRaises(oracle.OracleError):
                    oracle._verify_output_coordinate_trajectory_shape(ast.parse(mutation))

    def test_spatial_callsite_binds_helper_layer_to_a_2d_constructor(self) -> None:
        profile = oracle._verify_spatial_2d_callsite_shape(ast.parse(SPATIAL_2D_CALLSITE))
        self.assertEqual(profile["dimension"], 2)
        for mutation in (
            SPATIAL_2D_CALLSITE.replace("shape=[4, 3]", "shape=[4, 3, 2]"),
            SPATIAL_2D_CALLSITE.replace("positions=pos", "positions=other"),
            SPATIAL_2D_CALLSITE.replace(
                "nest.PlotTargets(layer[0], layer)",
                "nest.PlotTargets(layer[0], other)",
            ),
            SPATIAL_2D_CALLSITE.replace(
                "layer = nest.Create",
                "pos = nest.spatial.grid(shape=[4, 3, 2], extent=[2.0, 1.5, 1.0])\n"
                "layer = nest.Create",
            ),
            SPATIAL_2D_CALLSITE.replace(
                "layer = nest.Create",
                "(pos,) = (other,)\nlayer = nest.Create",
            ),
            SPATIAL_2D_CALLSITE.replace(
                'layer = nest.Create("iaf_psc_alpha", positions=pos)',
                'layer = nest.Create("iaf_psc_alpha", positions=pos)\n'
                "layer = nest.Create(\n"
                '    "iaf_psc_alpha",\n'
                "    positions=nest.spatial.grid(\n"
                "        shape=[4, 3, 2], extent=[2.0, 1.5, 1.0]\n"
                "    ),\n"
                ")",
            ),
            SPATIAL_2D_CALLSITE.replace(
                "nest.PlotTargets(layer[0], layer)",
                "(layer,) = (other,)\nnest.PlotTargets(layer[0], layer)",
            ),
            SPATIAL_2D_CALLSITE.replace(
                "nest.PlotTargets(layer[0], layer)",
                "alias = layer\n"
                "(alias,) = (other,)\n"
                "nest.PlotTargets(layer[0], layer)\n"
                "nest.GetPosition(alias)",
            ),
            SPATIAL_2D_CALLSITE
            + """
def inspect_population(population):
    (population,) = (other,)
    nest.GetPosition(population)

inspect_population(layer)
""",
            SPATIAL_2D_CALLSITE
            + """
def inspect_population(population):
    nest.GetPosition(population)

inspect_population(layer)
unsafe_inspector = inspect_population
unsafe_inspector(other)
""",
        ):
            with self.subTest(mutation=mutation):
                with self.assertRaises(oracle.OracleError):
                    oracle._verify_spatial_2d_callsite_shape(ast.parse(mutation))

    def test_inventory_authority_rejects_byte_drift_digest_drift_and_duplicates(self) -> None:
        original = oracle.SOURCE_INVENTORY_PATH.read_bytes()
        with tempfile.TemporaryDirectory() as directory:
            candidate_path = Path(directory) / "inventory.json"

            candidate_path.write_bytes(original + b"\n")
            with patch.object(oracle, "SOURCE_INVENTORY_PATH", candidate_path):
                with self.assertRaisesRegex(oracle.OracleError, "byte length drifted"):
                    oracle._load_pinned_source_inventory()

            changed = json.loads(original)
            changed["upstream"]["release"] = "forged"
            changed_bytes = json.dumps(
                changed,
                ensure_ascii=False,
                separators=(",", ":"),
                sort_keys=True,
            ).encode("utf-8")
            candidate_path.write_bytes(changed_bytes)
            with (
                patch.object(oracle, "SOURCE_INVENTORY_PATH", candidate_path),
                patch.object(
                    oracle,
                    "PINNED_SOURCE_INVENTORY_ARTIFACT_BYTE_LENGTH",
                    len(changed_bytes),
                ),
                patch.object(
                    oracle,
                    "PINNED_SOURCE_INVENTORY_ARTIFACT_SHA256",
                    sha256(changed_bytes),
                ),
            ):
                with self.assertRaisesRegex(oracle.OracleError, "digest does not bind"):
                    oracle._load_pinned_source_inventory()

            duplicate_bytes = b'{"member":1,"member":2}'
            candidate_path.write_bytes(duplicate_bytes)
            with (
                patch.object(oracle, "SOURCE_INVENTORY_PATH", candidate_path),
                patch.object(
                    oracle,
                    "PINNED_SOURCE_INVENTORY_ARTIFACT_BYTE_LENGTH",
                    len(duplicate_bytes),
                ),
                patch.object(
                    oracle,
                    "PINNED_SOURCE_INVENTORY_ARTIFACT_SHA256",
                    sha256(duplicate_bytes),
                ),
            ):
                with self.assertRaisesRegex(oracle.OracleError, "strict JSON failed"):
                    oracle._load_pinned_source_inventory()

    def test_retained_oracle_rejects_duplicate_and_stale_semantic_bindings(self) -> None:
        with self.assertRaisesRegex(oracle.OracleError, "strict UTF-8 JSON"):
            oracle._validate_retained_oracle(b'{"protocol":1,"protocol":1}\n')

        retained = json.loads(
            (ROOT / "docs/audit/nest-example-visualization-oracle.v1.json").read_bytes()
        )
        retained["description"] = "forged"
        forged = oracle._canonical_bytes(retained) + b"\n"
        with self.assertRaisesRegex(oracle.OracleError, "semantic digest does not match"):
            oracle._validate_retained_oracle(forged)


if __name__ == "__main__":
    unittest.main()
