# `contract/` — the normative Cortexel contract

This directory contains the **normative contract**: reviewed source authorities plus
deterministically generated normative projections. The distinction is explicit below;
generated schemas and the manifest are written into `contract/` by the generator and
must never be hand-edited.

No runtime figure implementation may invent or rewrite this contract. If a TypeScript
or Python runtime module and a generated-from-source contract projection disagree, the
reviewed source plus deterministic generator are authoritative and the runtime is a
defect.

## Layout

| Path | Role |
|---|---|
| `meta/contract-source.schema.json` | The meta-schema every skill definition must satisfy. |
| `meta/canonicalization-registry.schema.json` | The meta-schema for the closed canonical identifier-set registry and its executable conformance corpus. |
| `registries/` | Closed registries: capabilities, units, error codes, semantic validators, numeric policies, disclosures, budget profiles, legacy skill map. |
| `schemas/` | Reviewed shared/request/artifact schemas plus generated registry enums, the stable per-skill request union, and composed per-skill schemas. |
| `skills/` | One file per catalog entry: its scientific contract, request schema, validators, budgets, disclosures, and migration. |
| `conformance/` | Valid, invalid, and canonical vectors. Both TypeScript and Python must agree on all of them. |
| `manifest.v1.json` | **Generated.** The contract digest and the inventory it was computed over. |

## Generated outputs

`bun run generate` derives all of the following from this directory. None of them
may be hand-edited:

- `contract/schemas/skills/<id>.request.v1.schema.json` — composed request schemas
- `contract/schemas/stable-figure-request-union.v1.schema.json` — closed union of all stable composed request schemas, embedded by FigureArtifactV1
- `contract/schemas/generated/registry-enums.v1.schema.json` — registry-derived closed ids and exact renderer/disclosure identity pairs
- `contract/manifest.v1.json` — contract digest + source inventory
- `src/generated/**` — TypeScript catalog, identity, budget, and registry mirrors
- `python/src/cortexel/generated/**` — the Python mirror

Generation first validates every `contract/skills/*.json` file against
`meta/contract-source.schema.json`; a schema that is merely documented but never run is
not a boundary. `bun run check:generated` then checks committed output drift.
Generation is deterministic: running it twice produces byte-identical output.

## Packaged copy

After tsup cleans `dist/`, `scripts/prepare-package.ts` independently enumerates the
normative JSON source set, verifies every per-file digest and both aggregate identities
against this manifest, and writes the exact source bytes once under `dist/contract/`.
It then verifies the installed-layout copy again. Package export aliases such as
`cortexel/contract/manifest.json`, registry paths, schema paths, and skill paths all
point into that one physical tree; the legacy `cortexel/skills.manifest.json` remains a
separate pre-1.0 data product and is not relabelled as this contract.

The FigureRequest validator resolves `dist/contract` relative to its own ESM/CJS
module. Source development resolves this repository directory by the same
module-relative rule. Neither path consults `process.cwd()` or the network.

## The contract digest

The digest identifies *the contract*, not the package. It is computed as:

1. Take the **normative source set** — this directory, excluding `manifest.v1.json`
   itself (it cannot contain its own hash) and excluding `conformance/`
   (vectors test the contract, they are not the contract).
2. Canonicalize each JSON file with RFC 8785 (JSON Canonicalization Scheme).
3. SHA-256 each canonical UTF-8 byte sequence.
4. Sort the entries by repository-relative path.
5. SHA-256 the canonical JSON of that sorted inventory.

The result is reported everywhere as `sha256:<64 lowercase hex>`. A shortened
prefix may be *displayed* to humans; it is never an API value.

Any change to a normative source file changes the digest. That is the point.

## Figure derivation receipt digest domains

Trace preparation and aggregate receipts use one explicit construction. Let
`JCS(x)` be the RFC 8785 UTF-8 encoding of `x`, and let
`H(x) = "sha256:" + lowercase_hex(SHA-256(x))`. Then:

```text
C(payload)          = H(JCS(payload))
D(domain, payload)  = C({ "digestDomain": domain, "payload": payload })
```

Property order in the prose below is explanatory; JCS fixes the bytes. Array order is
always significant. The `uncertaintyLower` and `uncertaintyUpper` members in a
view-output payload are always present: an absent channel is encoded as JSON `null`,
not by omitting the member. A displayed event materialization may likewise be the
explicit JSON `null` when a source series is not painted.

For a weight or compartment preparation batch, `b` is respectively
`cortexel.weight_trace.prepare_series_batch/v1` or
`cortexel.compartment_trace.prepare_series_batch/v1`:

```text
globalContextDigest =
  D(b + "/global-context", exact_family_global_context)

seriesReceipts[i].inputDigest =
  D(b + "/series-input", {
    globalContextDigest,
    sourceIndex: i,
    seriesIdentity,
    role,
    inputPayload: exact_canonical_request_carrier
  })

retainedSourceOrdinalDigest =
  D(b + "/retained-source-ordinals", {
    sourceIndex,
    seriesIdentity,
    kind,
    retainedOrdinalGroups
  })

view.outputDigest =
  D(b + "/view-output", {
    sourceIndex,
    seriesIdentity,
    kind,
    window,
    prepared,
    uncertaintyLower,
    uncertaintyUpper
  })

contextWitness.observationDigest =
  D(b + "/context-witness", {
    sourceIndex,
    seriesIdentity,
    role,
    stateObservationIndex,
    observation
  })

materialization.fullOutputDigest =
  D(b + "/materialization-full", {
    sourceIndex,
    seriesIdentity,
    materialization: full
  })

materialization.displayedOutputDigest =
  D(b + "/materialization-displayed", {
    sourceIndex,
    seriesIdentity,
    materialization: displayed
  })

batch.inputDigest =
  D(b + "/operation-input", {
    globalContextDigest,
    seriesInputDigests: seriesReceipts.map(r => r.inputDigest)
  })

batch.outputDigest =
  D(b + "/operation-output", complete_closed_batch_receipt)
```

The exact family global context is also closed. First normalize the request window as:

```text
w = {
  start: canonicalRequest.data.window.start,
  stop: canonicalRequest.data.window.stop,
  unit: canonicalRequest.data.window.unit,
  finalEdgeInclusive:
    canonicalRequest.data.window.boundary ends with "]"
}
```

The three payloads passed as `exact_family_global_context` are exactly:

```text
weight_edges_context = {
  skillId: canonicalRequest.skill.id,
  dataContext: { ...canonicalRequest.data, series: null },
  parameters: canonicalRequest.parameters,
  analysisWindow: w,
  observation: canonicalRequest.data.observation,
  targetValueUnit: edge_target_value_unit
}

weight_preaggregated_context = {
  skillId: canonicalRequest.skill.id,
  dataContext: { ...canonicalRequest.data, aggregate: null },
  parameters: canonicalRequest.parameters,
  analysisWindow: w,
  observation: canonicalRequest.data.aggregate.observation,
  targetValueUnit: canonicalRequest.data.aggregate.values.unit
}

compartment_context = {
  skillId: canonicalRequest.skill.id,
  dataContext: { ...canonicalRequest.data, series: null },
  parameters: canonicalRequest.parameters,
  analysisWindow: w,
  targetValueUnit: canonicalRequest.data.series[0].values.unit
}
```

For an individual weight display, `edge_target_value_unit` is the value unit of
`data.series[0]`. For a derived aggregate display, it is the value unit of the first
series in canonical request order whose `edgeId` occurs in `data.membership.members`;
membership-array order does not choose it. A preaggregated weight request binds the
exact aggregate carrier separately as series input zero.

Revision-4 aggregate domains are the exact algorithm id followed by `/v4`. If `a`
is that domain and `p` is the immediately preceding preparation batch:

```text
aggregate.parameters.preparationBatchOutputDigest =
aggregate.receipt.preparationBatchOutputDigest =
p.outputDigest

aggregate.inputDigest =
  D(a + "/operation-input", {
    preparationBatchOutputDigest: p.outputDigest,
    scientificInputDigest
  })

aggregate.outputDigest =
  D(a + "/operation-output", {
    scientificOutputDigest,
    outputUnits
  })
```

The output-unit carriers are:

```text
weight_output_units = {
  timeUnit: aggregate.parameters.analysisWindow.unit,
  valueUnit: aggregate.parameters.targetValueUnit
}

compartment_output_units = {
  timeUnit: aggregate.receipt.output.time.unit,
  valueUnit: aggregate.receipt.output.value.unit
}
```

For a weight aggregate, let `selected_raw_members` be
`canonicalRequest.data.series` filtered—in that existing order—to edge ids present
in `canonicalRequest.data.membership.members`. Its exact input projection is:

```text
scientificInputDigest =
  C({
    membership: canonicalRequest.data.membership,
    members: selected_raw_members,
    observation: canonicalRequest.data.observation,
    analysisWindow: w,
    weightComparability: canonicalRequest.parameters.weightComparability,
    targetValueUnit: edge_target_value_unit
  })
```

`scientificOutputDigest` is `C(aggregate.receipt.output)`, whose bounded carrier
contains evaluation times, aggregate values, member/contributor counts, and exact
descriptive-spread output. Its state-witness digest is:

```text
D("cortexel.weight_trace.aggregate_members/v4/state-witnesses",
  preceding_batch.seriesReceipts.flatMap(entry =>
    entry.contextWitnesses
      .filter(w => w.consultedByDerivedAggregate)
      .map(w => ({
        seriesIdentity: entry.seriesIdentity,
        role: w.role,
        stateObservationIndex: w.stateObservationIndex,
        observationDigest: w.observationDigest
      }))))
```

For a compartment aggregate, `selected_raw_series` is the array formed by resolving
each `aggregate.parameters.selectedCompartmentIds` entry, in that selection order, to
its unique matching `canonicalRequest.data.series` entry. Its two exact projections
are:

```text
scientificInputDigest = C(selected_raw_series)

scientificOutputDigest =
  C({
    times: aggregate.receipt.output.time.values,
    values: aggregate.receipt.output.value.values,
    unit: aggregate.receipt.output.value.unit
  })
```

Here `unit` is the **value** unit. The time unit is intentionally outside that legacy
inner projection and is bound by the revision-4 `outputUnits` wrapper above.

The two top-level logical digests do not use a `D` domain wrapper:

```text
artifact.provenance.requestDigest = C(artifact.canonicalRequest)
artifact.artifactDigest =
  C(artifact with the top-level artifactDigest member omitted)
```

The internal artifact gate recomputes the canonical-request digest, logical artifact
self-digest, canonical-request-to-batch bindings, batch operation wrappers,
request-derived view windows and transform inventories, event/materialization/paint
topology, witness-role semantics, receipt-internal count conservation, aggregate
chain wrappers, exact carried aggregate-output digests, declared-grid equality,
union/shared-grid boundary and cardinality implications, membership counts, and
method-dependent descriptive-interval identities. These are bounded relations among
the request and receipt carriers already present; they are not a re-derivation of
prepared views or scientific values from raw series.
The gate does **not** re-execute trace preparation or either scientific aggregation
from source values. Artifact 1.0 omits the intermediate preimages for the
retained-source-ordinal, prepared-view, context-witness-observation, and
materialization subdigests, so the gate recomputes the enclosing batch wrapper but not
those inner commitments. It also does not authenticate an artifact and receives
neither SVG nor table bytes. Detached SVG verification requires the still-unimplemented
reader/verifier plus the SVG bytes; table-content integrity additionally requires a
canonical digest-bound table sidecar. Schema validity is never presented as any of
those assurances.

## Schema `$id`s

Schema `$id`s are stable, versioned identifiers of the form:

```
https://sepahead.github.io/cortexel/schemas/v1/<name>.schema.json
```

They are **identifiers**, and are resolved locally from this directory. At the
`0.9.0` tag and in the current unreleased development tree, the documentation site is
not deployed, so these URLs do not resolve over the network. Cortexel never fetches
them: all resolution is offline and in-repository. A versioned `$id` will never be
changed in place once published.
