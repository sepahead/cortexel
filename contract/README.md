# `contract/` — the normative Cortexel contract

Everything in this directory is **normative source**. It is reviewed, versioned,
hashed, and generated *from* — never *into*.

Nothing here may be produced by the implementation it constrains. If a TypeScript
or Python module and a file in this directory disagree, the file in this directory
is right and the code is a defect.

## Layout

| Path | Role |
|---|---|
| `meta/contract-source.schema.json` | The meta-schema every skill definition must satisfy. |
| `registries/` | Closed registries: capabilities, units, error codes, semantic validators, disclosures, budget profiles, legacy skill map. |
| `schemas/` | Draft 2020-12 structural schemas for the shared types and the request/artifact envelopes. |
| `skills/` | One file per catalog entry: its scientific contract, request schema, validators, budgets, disclosures, and migration. |
| `conformance/` | Valid, invalid, and canonical vectors. Both TypeScript and Python must agree on all of them. |
| `manifest.v1.json` | **Generated.** The contract digest and the inventory it was computed over. |

## Generated outputs

`bun run generate` derives all of the following from this directory. None of them
may be hand-edited:

- `contract/schemas/skills/<id>.request.v1.schema.json` — composed request schemas
- `contract/manifest.v1.json` — contract digest + source inventory
- `src/generated/**` — TypeScript catalog, identity, and precompiled validators
- `python/src/cortexel/generated/**` — the Python mirror
- `docs/reference/**` — the human-readable catalog reference

`bun run check:generated` regenerates into a temporary directory and fails if the
committed output differs. Generation is deterministic: running it twice produces
byte-identical output.

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

## Schema `$id`s

Schema `$id`s are stable, versioned identifiers of the form:

```
https://sepahead.github.io/cortexel/schemas/v1/<name>.schema.json
```

They are **identifiers**, and are resolved locally from this directory. As of
0.9.0 the documentation site is not deployed, so these URLs do not yet resolve
over the network. Cortexel never fetches them: all resolution is offline and
in-repository. A versioned `$id` will never be changed in place once published.
