<!-- This repository is Cortexel's canonical source. See CONTRIBUTING.md. -->

## Summary

<!-- What does this change and why? -->

## Checklist

- [ ] `bun run check` passes
- [ ] `bun run check:formal` passes
- [ ] New behavior is covered by a test
- [ ] Design laws are upheld, especially fail-closed honesty and bloom safety
- [ ] Strict params/envelope schemas and the language-neutral manifest remain in parity
- [ ] First-party frame callbacks reuse state and avoid React state writes; any
      source-guard claim stays limited to reviewed direct syntax
- [ ] Committed `dist/` is rebuilt and clean-room package smoke passes
- [ ] `CHANGELOG.md` updated under `Unreleased`
