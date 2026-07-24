# OutputAuthority V1

OutputAuthority V1 is Cortexel's internal, fail-closed check of one narrow claim:
for a validated canonical request, the final compiler-owned `RenderPlanV1` carries the
exact alternative-table rows, source-template summary, mandatory disclosures, and
ordered scientific-carrier identities independently derived for that request.

The check runs synchronously on a detached, deeply frozen plan immediately before the
normative SVG serializer. A failure is an internal refusal; no partial SVG is returned.
It is not a public attestation API and creates no receipt.

The `cortexel/render-svg` package entry exposes only end-to-end builders. Each builder
validates its input or requires the live branded `ValidatedRequest`; the raw plan model,
resource counter, formatting/scaling primitives, and SVG serializer remain internal.
There is no supported public path that accepts a caller-constructed RenderPlan and labels
its output as a Cortexel figure.

## What is checked

Each of the nineteen stable skill sources owns a finite `outputAuthority` declaration:

- one closed, revision-bound evaluator id;
- the exact ordered alternative-table columns and evaluator-derived row sequence;
- a finite vocabulary of summary facts substituted once into the skill's source-owned
  template;
- disclosure facts from which the closed disclosure registry derives the exact ordered
  disclosure set and text;
- an exact depth-first sequence of role-tagged scientific carriers, including class and
  stable request-derived provenance; and
- paired finite influence witnesses with explicit affected and protected derivations.

The gate accepts only Cortexel's live `ValidatedRequest` capability and a plan cloned,
closed, deeply frozen, and branded by the compiler-only plan-closure boundary. It
resolves the declaration and evaluator internally. A caller cannot provide an evaluator,
an expected row count, an observed authority tree, a disclosure set, or a plan-shaped
look-alike.

Per-family evaluators derive their results directly from the canonical request. A
mechanical import boundary prevents them from importing analysis, adapters, compilers,
renderers, or the generated catalog. The plan extractor separately traverses the actual
role-tagged atomic marks. Exact sequence comparison detects omissions, additions,
reordering, duplicate-multiplicity drift, and carrier-provenance drift.

For `line` and `path` marks whose data carriers declare `renderRunOrdinal`, extraction
also checks the structural partition recorded in the RenderPlan. All tagged data
carriers in one RenderPlan line/path subpath must have exactly one distinct
`(classId, seriesId, renderRunOrdinal)` identity, and each such identity must occur in
exactly one subpath across the plan. A subpath that mixes tagged data carriers with
data carriers lacking `renderRunOrdinal` refuses; a wholly untagged legacy subpath
remains subject to the ordinary carrier-sequence check.

That run-partition check is evidence about RenderPlan structure only. It does not parse
serialized SVG or establish a corresponding physical SVG path or element, and it does
not audit coordinates, geometry, clipping, styling, visibility, or on-screen
continuity/presence.

The effective resource profile is not caller-request science. Request-only evaluators
are forbidden from authoring either budget-profile disclosure fact. The gate derives
the effective profile independently from the branded validation-time host profile and
the request-selected profile, using its own dominance decision over the closed budget
registry. A fact collision, unknown profile, or incomparable profile pair refuses.
For any request accepted under two profiles, profiles may change acceptance and the
mandatory disclosure suffix, but never the exact table rows or ordered scientific-carrier
class/provenance sequence: V1 has no budget-driven truncation, sampling, excerpt, or
compaction path. An extra mandatory footer can reserve more vertical space and therefore
change plot coordinates and serialized SVG bytes; numeric geometry is presentation output
and remains outside V1's `carrier_only` assurance.

Summary substitution is deliberately one pass. The source template is checked before
substitution; every fact is bounded, well-formed, control-safe display text; and fact
text is then treated literally. A caller string such as `Selection {nodeCount}` cannot
be reparsed as a second template program. The complete summary, including the exact
registry-derived disclosure suffix, is compared byte-for-byte with the frozen plan.

## Carrier-only means carrier-only

Every V1 geometry class declares `payloadAssurance: carrier_only`. The gate checks the
exact global carrier sequence, class, and stable provenance. It intentionally ignores
the compiler-extracted geometry payload for those classes.

Therefore OutputAuthority V1 does **not** establish:

- SVG bytes, element order, XML encoding, or the behavior of the serializer;
- numeric coordinates, scales, paths, sizes, colours, styles, clipping, or visibility;
- that a carrier role or its provenance was assigned correctly by a defective or
  malicious compiler;
- visual legibility, screen-reader behavior, accessibility effectiveness, or that a
  host actually displayed the SVG or disclosures; or
- cross-platform byte identity.

Those properties require separate renderer, serializer, geometry, accessibility, and
package evidence. A future `canonical_geometry_exact` class is legal only after a
separately reviewed evaluator independently derives its complete geometry payload.

## Artifact status is unchanged

OutputAuthority is an in-process translation gate, not persisted assurance. It does not
change FigureArtifactV1 1.0:

- reference comparison remains `not_run`;
- `tableBinding` remains `shape_only`; table cells and row bytes are not artifact-bound;
- no OutputAuthority verdict, evaluator result, plan digest, or assurance token is
  serialized; and
- no detached verifier can infer that the gate ran merely from a schema-valid artifact.

Adding a persisted verdict would require an artifact-contract change, a canonical
binding for the verified outputs, a duplicate-aware reader, and an executable detached
verifier. None is implied by this internal gate.

## Trusted computing base and residual common modes

The independent family code is intentionally diverse from the compiler, but it is not
an independent implementation of the whole system. Its explicit trusted computing base
includes:

- strict validation, canonicalization, canonical digest, and the validated-request
  capability;
- source-contract generation and the OutputAuthority meta/source laws;
- shared exact-binary64, unit, deterministic-transcendental, canonical-JSON, disclosure,
  and finite budget-registry primitives used by a family;
- the closed evaluator registry and the correctness of each family evaluator;
- compiler-authored atomic roles and provenance;
- plan closure, extraction, interpretation, and the synchronous gate-to-serializer call;
  and
- the source-owned table schema, summary template, disclosure registry text, and budget
  registry data.

A defect shared by a compiler and one of those trusted primitives can escape the gate.
A coordinated compiler defect can also lie consistently in atomic role tags. The finite
influence witnesses, living examples, mutation tests, and exhaustive closed-registry
checks are regression evidence; they are not universal formal proofs over every accepted
request. Cortexel must not describe this boundary as an SVG proof, a visual proof, a
scientific certification, diverse double compilation, or persisted assurance.

## Future sealing path

A stronger boundary would verify immutable serialized output rather than only a plan:

1. serialize once into immutable bytes;
2. parse those bytes with a closed, duplicate-aware SVG extractor;
3. independently bind visible carrier elements, disclosure text, and a canonical
   complete-table sidecar to the request and output digests;
4. persist a versioned verdict only after a detached verifier can recompute it; and
5. run genuinely diverse verifier implementations in isolated workers for claims that
   justify the additional trusted surface.

Until those steps ship together, the exact claim remains validated-request to frozen
RenderPlan translation only.
