# NEST 3.10 example visualization classification V3

V3 is the current source-only classification of visualization intent in the
98 canonical official PyNEST example bodies at NEST commit
`acca9704da248750219a027db99fec6cd1f9052a`. It supersedes V2 for current
claims without rewriting the immutable V2 artifact. It does not import NEST,
run an example, produce an upstream figure, or certify scientific or visual
parity.

The machine-readable authorities are:

- [`nest-example-coverage.v3.json`](./nest-example-coverage.v3.json), the
  canonical V3 projection;
- [`nest-example-coverage.v3.schema.json`](./nest-example-coverage.v3.schema.json),
  its strict schema;
- [`nest-example-visualization-oracle.v1.json`](./nest-example-visualization-oracle.v1.json),
  the differential stdlib-Python AST oracle; and
- [`nest-example-visualization-oracle.v1.schema.json`](./nest-example-visualization-oracle.v1.schema.json),
  the oracle's strict schema.

`bun run check:nest-audit` checks retained canonical bytes, semantic bindings,
the reviewed oracle-generator source and immutable V2 authorities, V3 regeneration,
and both schema generators without requiring Python for an ordinary TypeScript build.
`bun run check:generated` includes that gate. `bun run check:nest-oracle-python`
separately repeats the retained Python oracle self-check with isolated, no-site startup.

## Evidence boundary

The Python oracle independently derives the closed correction sets, but it is
differential rather than a second complete taxonomy. It verifies the SHA-256 and
byte length of all 112 selected source leaves from the exact V2 source inventory,
parses the 109 regular Python bodies with the standard-library `ast` module, and
checks the exact two helper blobs that define raster and spatial behavior. It
then applies its AST-derived corrections to V2. The remaining 63 taxonomy rows
are inherited V2 review, not independently reclassified.

Full derivation requires an exact selected-source projection of the pinned NEST
commit: the 112 inventory leaves and two helper files must have their reviewed
bytes. The generator does not independently authenticate Git metadata or the
unselected remainder of the checkout.

The AST carrier checks are deliberately conservative and limited to explicit
assignment targets, overlapping attribute/subscript writes, and direct uses of
reviewed local helper functions. They reject the adversarial rebinding shapes in
the retained negative suite, but they are not a complete proof over Python
aliasing, reflection, mutation, exceptions, or control flow. Exact full-source
hashes are the byte authority; the AST evidence is a source-snapshot
classification and navigation aid, not a runtime capability.

```bash
result_dir="$(mktemp -d)"
chmod 0700 "$result_dir"
python -I -S -B scripts/generate-nest-example-visualization-oracle.py \
  --source-root /absolute/path/to/nest-at-acca9704 \
  --output "$result_dir/nest-example-visualization-oracle.v1.json"
cmp "$result_dir/nest-example-visualization-oracle.v1.json" \
  docs/audit/nest-example-visualization-oracle.v1.json
```

The output path must be absent. Calling the generator with only `--check`
revalidates retained canonical bytes and the domain-separated semantic digest;
it does not redo source derivation without a source root. The TypeScript V3
generator separately requires exact bytes for the V2 coverage, V2 schema, V2
implementation, V2 generator, source inventory, documentation inventory, and
the Python oracle and the reviewed generator-source bytes. The generator-source
digest is not execution authority: Python has already started before the script
can read its pathname. Neither path executes upstream code.

## Corrected denominator

V3 changes exactly 35 canonical projections and retains 63 unchanged. The 35
are the union of independently derived categories, so overlaps are counted once:

| Correction | Exact source-derived count | V3 meaning |
|---|---:|---|
| `nest.raster_plot.from_device` | 9 | Raster plus the helper's enabled histogram and active-sender-normalized rate; eight calls pass literal `hist=True`, SONATA relies on the reviewed default, and every explicit bin width is finite and positive. |
| HH response curve | 1 | `hh_psc_alpha.py` plots stimulus amplitudes against measured event frequencies; it is a response curve, not a time-domain analog trace. |
| Intrinsic-current presentation | 1 | One base subplot and one derived twin y axis carry voltage/threshold and current signals. The semantic carrier remains `multisignal_trace`; dual-axis composition is a presentation demand, not an invented scientific family. |
| 2D spatial helper/direct plots | 12 | Eight source/target-neighborhood membership maps and four node maps, all with equal x/y scale. Membership points are not endpoint-connecting network edges. |
| Spatial masks/probability field | 6 / 1 | Mask patches and the one clamped probability image remain explicit operations; a probability field is neither a node map nor an observed edge set. |
| Shared axes | 14 x / 6 y | Literal non-false `sharex` and `sharey` call-site semantics are retained. |
| Equal-scale output-coordinate paths | 2 | The paths are generic ordered 2D trajectories. They are not recast as `neuro.phase_plane`, because the sources plot readout/target coordinates rather than model-state dynamics. |

The raster helper's rate is
`1000 * bin_event_count / (histogram_bin_width_ms * unique_plotted_sender_count)`.
Its denominator is the unique sender ids in the helper's unfiltered timestamp
carrier, so silent members of a biological population are absent. It is not
interchangeable with a complete-population rate.

`if_curve.py` is deliberately outside the visualization-body denominator. Its
exact pinned source computes and stores a two-dimensional response surface but
contains no active visualization operation. The oracle anchors its distinct formula
`n_events * 1000.0 / (1.0 * self.n_neurons * self.t_sim)`, the class-defined
configured neuron count, a fresh recorder, exact all-to-all population-to-recorder
connection, per-trial build/connect/simulate/read order, exact two-dimensional
carrier, and retained `I_mean`/`I_std`/`rate` writes.
These are source-syntax findings, not a runtime or general Python dataflow proof.
The reviewed formula therefore must not be relabeled with the raster helper's
different active-sender denominator.

## Capability result

V3 names 28 semantic demand families: 14 have a plausible complete stable-skill
candidate, four have only a partial candidate, and ten have no stable candidate.
These are source-review representability assessments only. All example-specific
mapped-output, executable-adapter-match, upstream-execution, renderer-parity, and
scientific-certification counts remain zero.

Important gaps remain:

- no stable contract expresses active-sender-normalized raster histograms as the
  reviewed helper defines them;
- no generic parametric-trajectory contract carries readout-coordinate paths
  with equal geometric scale without adding phase-plane semantics;
- source/target membership, spatial probability fields, and mask geometry need
  explicit stable contracts or composition rules;
- dual axes, shared axes, and cross-capability panels still need a bounded bundle
  contract; and
- no official example has an execution-bound detached capture and receipt that
  matches the one packaged `nest-spike-recorder.v5` adapter profile.

Source classification is useful roadmap evidence. It is not evidence that
Cortexel can render every NEST result today, that any example completes, or that
a Cortexel figure agrees with Matplotlib or an upstream reference output.
