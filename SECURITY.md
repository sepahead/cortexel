# Security Policy

> The technical threat model — assets, trust boundaries, controls, and residual risks
> — is in [`docs/SECURITY_MODEL.md`](./docs/SECURITY_MODEL.md). This file is the
> reporting policy.

## Reporting a vulnerability

Please report security issues privately via GitHub's
[security advisories](https://github.com/sepahead/cortexel/security/advisories/new)
rather than opening a public issue. This is a single-maintainer, pre-1.0 project;
reports are handled on a best-effort basis without a guaranteed response time.

## Scope

Cortexel renders untrusted, agent-emitted `VizSpec` payloads. Relevant concerns:

- **Input validation.** Untrusted agent payloads must pass `validateSpec` (for a
  self-describing spec) or `validateSkillInvocation` (with an explicit skill id).
  A `scene:null` host-renderer payload must pass `validateHostRendererSpec` or
  `validateHostRendererInvocation`; `validateSkillParams` alone is not sufficient
  because it does not enforce provenance, route membership, or caption binding.
  The lower-level `validateVizSpec` checks only the envelope and is reserved for
  trusted host-authored showcase content. `VizSpecRenderer` is strict by default;
  skill-less envelope rendering requires the explicit `trustedEnvelope` opt-in and
  must never receive agent/network data. Hosts accepting specs over a network
  boundary **should** mirror the strict skill schema, provenance requirements,
  resource ceilings, exact-JSON policy, manifest `paramConstraints`, and
  params↔provenance constraints server-side.
- **Raw simulator input.** NEST device/detector transforms use a separate
  typed-array-aware snapshot boundary because NumPy-adjacent arrays are not JSON.
  It rejects accessors without invoking them, bounds nesting/input/output
  amplification, and never assumes recorder event order. A successful transform
  produces params only; the result must still pass the ordinary strict VizSpec
  gate with truthful provenance before rendering.
  SynapseCollection normalization accepts either official singular/scalar fields
  or canonical plural arrays, rejects mixed forms and scalar broadcasting, and
  preserves every autapse/multapse row. Connection and position transforms require
  typed single-process/MPI-local/all-ranks-merged scope; rank-local evidence is not
  silently promoted to a complete-network claim.
- **Raw JSON parsing.** Object-level gates cannot detect duplicate member names
  after a normal parser has overwritten earlier values. Network/text boundaries
  must reject duplicate names before materialization, then apply the manifest's
  binary64, well-formed UTF-16, normalization, budget, schema, and constraint order.
- **Scientific-honesty integrity.** The fail-closed provenance model is a
  correctness boundary: a change that lets synthetic or advisory data render
  without its disclosure caption is treated as a defect, report it. Cortexel-scene
  hosts overlay the caption returned by the strict gate; D3/matplotlib/Manim hosts
  must likewise display the caption returned by the host-renderer gate. Caller free
  text is explicitly labeled unverified, control/bidi-sanitized, and isolated from
  the mandatory disclosure; never render it as a replacement caption.
- **Agent repair output.** `formatInvocationErrors` serializes dynamic paths,
  messages, and examples as structured JSON marked `untrustedData:true`. Treat those
  fields as data, never as model instructions; do not convert them back into raw
  line-oriented prompt text. Public diagnostics are count-, path-, message-, and
  aggregate-size bounded to avoid validation-error amplification.

Cortexel performs no implicit network, `eval`, Blob-worker, or font-CDN operations at
runtime. FigureRequest validation reads only the module-relative packaged contract;
the offline CLI performs only the bounded filesystem operations the caller explicitly
requests. The knowledge-graph label uses a local CanvasTexture, and hosts remain in
control of any assets their injected renderer chooses to load.
