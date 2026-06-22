# Security Policy

## Reporting a vulnerability

Please report security issues privately via GitHub's
[security advisories](https://github.com/sepahead/cortexel/security/advisories/new)
rather than opening a public issue. We aim to acknowledge reports within a few
business days.

## Scope

Cortexel renders untrusted, agent-emitted `VizSpec` payloads. Relevant concerns:

- **Input validation.** Specs are validated with Zod (`validateVizSpec`) before
  rendering. Hosts accepting specs over a network boundary **should** mirror this
  validation server-side; the client-side gate is not a substitute.
- **Scientific-honesty integrity.** The fail-closed provenance model is a
  correctness boundary: a change that lets synthetic or advisory data render
  without its disclosure caption is treated as a defect, report it.

Cortexel performs no network, filesystem, or `eval`-style operations.
