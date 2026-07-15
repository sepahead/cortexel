# cortexel (Python)

The independent Python reader for [Cortexel](https://github.com/sepahead/cortexel)
scientific figure contracts.

> **0.9.0 — a pre-1.0 development preview.** Not published to PyPI.

This package validates, canonicalizes, and digests Cortexel requests **without invoking
Node and without importing any generated JavaScript**. That independence is the whole
point: agreement between this implementation and the TypeScript one on the same corpus is
*evidence*, not a tautology. The cross-language parity test in the repository
(`test/crossLanguageParity.test.ts`) confirms the two agree byte-for-byte on the canonical
digest of every contract example.

## What it does

- **Strict parsing** (`parse_json_strict`) — rejects duplicate object members (which
  `json.loads` would silently resolve), prototype-polluting keys, and non-finite numbers.
- **RFC 8785 canonicalization** (`canonicalize`, `canonical_digest`) — implemented from the
  scheme's rules, including ECMAScript number formatting and UTF-16 code-unit key ordering,
  so it matches the TypeScript canonicalizer to the byte. SHA-256 via the standard library.
- **Structural + semantic validation** (`validate_request`) — reads the same normative
  schemas the TypeScript side reads (no `jsonschema` dependency) and enforces the
  caller-authority boundary and unit rules. Deeper semantic validators are ported
  incrementally.
- **Contract identity** (`get_build_identity`) — read from the generated mirror, never
  guessed.

The base package is **pure standard library**: no `jsonschema`, no NumPy, no Node.

## Use

```python
import cortexel

request = {
    "contract": {"name": "cortexel-figure-request", "version": "1.0"},
    "skill": {"id": "neuro.population_rate"},
    "data": {...},
    "parameters": {...},
    "source": {"kind": "simulation"},
}

errors = cortexel.validate_request(request)   # empty list means valid
digest = cortexel.canonical_digest(request)   # sha256:<64 hex>, byte-identical to TS
```

## Test

```bash
PYTHONPATH=python/src python3 -m unittest discover -s python/tests
```

## Not yet done at 0.9.0

Rendering stays with the Node reference implementation (this package emits and checks the
contract, not the SVG). The scientific adapters (Neo, Elephant, PyNWB, NEST) are declared
as optional extras but not implemented. The full semantic-validator port is incremental.
See [`docs/KNOWN_LIMITATIONS.md`](../docs/KNOWN_LIMITATIONS.md).
