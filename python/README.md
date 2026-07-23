# cortexel (Python)

The independent Python reader for [Cortexel](https://github.com/sepahead/cortexel)
scientific figure contracts.

> **0.9.0 is the last tagged pre-1.0 development release. The working wheel metadata is
> the private, unreleased PEP 440 version `0.10.0.dev0`, paired with npm
> `0.10.0-dev.0`.** Not published to PyPI.

This package validates, canonicalizes, and digests Cortexel requests **without invoking
Node and without importing any generated JavaScript**. That independence is the whole
point: agreement between this implementation and the TypeScript one on the same corpus is
*evidence*, not a tautology. The cross-language parity test in the repository
(`test/crossLanguageParity.test.ts`) confirms the two agree byte-for-byte on the canonical
digest of every contract example.

## What it does

- **Strict parsing** (`parse_json_strict`) — rejects duplicate object members (which
  `json.loads` would silently resolve), prototype-polluting keys, non-finite numbers,
  unsafe bare-integer aliases that would round to a different binary64 value, and
  ill-formed Unicode (including lone surrogates in either member names or values).
- **RFC 8785 canonicalization** (`canonicalize`, `canonical_digest`) — implemented from the
  scheme's rules, including ECMAScript number formatting and UTF-16 code-unit key ordering,
  so it matches the TypeScript canonicalizer to the byte. SHA-256 via the standard library.
- **Fail-closed validation** (`validate_request`) — reads the same normative
  schemas the TypeScript side reads from an exact generator-owned package projection
  (never from the current working directory; no `jsonschema` dependency) and enforces the
  standard materialized-value budget through a detached exact-built-in JSON snapshot
  (subclasses, cycles, dangerous keys, malformed Unicode, non-finite/unsafe numbers, and
  depth/node/string/container excess fail before authority or schema evaluation), the
  caller-authority boundary, registered quantity-unit rules, the normative binary64
  interval-policy vectors, an independently implemented PSTH subset (typed time axes,
  exact count and per-bin exposure authority, declared sender exposure, normalized-value
  audits, missing-bin denominators, and baseline exposure), and an independently
  implemented response-curve subset: contextual time-window dimension/order,
  rate-denominator authority, exact mean-rate and raw peak-count audits, count-level raw
  peak estimators, aggregate peak lattices, latency-window binding, kernel identity, and
  peak-grid geometry. Renderer-only geometry and artifact/table budgets are not Python
  request-validation claims. Other semantic validators are ported incrementally. The
  current development reader therefore returns `SEMANTIC_VALIDATOR_UNAVAILABLE` after an otherwise clean
  request rather than falsely certifying a skill whose complete semantic-validator set is
  not yet ported. `validate_request_partial` exposes the implemented subset explicitly for
  differential development tests; an empty partial result is not a validity certificate.
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

errors = cortexel.validate_request(request)   # empty only after complete validation
digest = cortexel.canonical_digest(request)   # sha256:<64 hex>, byte-identical to TS

# Development inspection only; [] means "the documented subset found no error",
# not "valid Cortexel request".
partial_errors = cortexel.validate_request_partial(request)
```

`canonical_digest` hashes the exact value supplied to it; it is not an accepted-request
producer. The TypeScript full-validation boundary returns a detached canonical request
that always materializes the resolved installed skill revision at `skill.revision`, so
an omitted authored pin and an explicit-current pin share one accepted identity. The
partial Python validator checks revision mismatches but currently returns only
diagnostics: it exposes no branded accepted canonical request, artifact writer, or SVG
seed. Callers must not infer those absent assurances from an empty partial error list.

## Test

```bash
python -m unittest discover -s python/tests
mypy --config-file python/pyproject.toml python/src/cortexel
ruff check python/src python/tests scripts/smoke-python-package.py
python scripts/smoke-python-package.py
```

`mypy` is a development-only check configured in `pyproject.toml`; it is not a runtime
dependency. The package smoke builds the wheel and sdist once from the repository and
once from an exact VCS-free source copy, requires byte identity and a closed full-sdist
plus schema/license/type-marker inventory, then validates every packaged skill schema
from a clean installation in an unrelated directory. The base package metadata remains
pure standard library.

## Not yet done in the current development reader

Rendering stays with the Node reference implementation (this package emits and checks the
contract, not the SVG). The scientific adapters (Neo, Elephant, PyNWB, NEST) are not yet
implemented and therefore are not advertised as installable extras. The full
semantic-validator port is incremental;
full Python validation therefore fails closed with `SEMANTIC_VALIDATOR_UNAVAILABLE`, and
the TypeScript runtime remains the full validation authority.
See [`docs/KNOWN_LIMITATIONS.md`](../docs/KNOWN_LIMITATIONS.md).
