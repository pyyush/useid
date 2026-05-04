# Changelog

## [Unreleased] - 1.0.0 target

`1.0.0` is the planned stable release target and is not published yet. The latest npm-published version is still `0.1.0`; the local package baseline in this branch is `0.2.0`.

### Migration notes from published 0.1.0

- Treat `ResolveResult` as the stable discriminated union: branch on `result.resolved` before reading success or failure fields.
- Handle every stable abstention reason: `binding_mismatch`, `no_candidates`, `below_threshold`, and `ambiguous_match`.
- Keep custom scoring weights normalized. `semantic + structural + spatial` must sum to `1`.
- Expect stricter safe-abstention behavior for duplicate names, missing accessible-name evidence, role drift, incomplete layout evidence, and DOM/accessibility mismatches.
- Do not use redacted signatures for later resolution. Redacted output is for logs and support bundles only.
- Browser-harness alignment is docs/examples/design alignment only. There is no browser-harness dependency, backend, runtime bridge, or required browser runtime.

### Security and observability guidance

- Raw snapshots, signatures, candidate diagnostics, and explanations can contain page text, labels, accessible names, accessible descriptions, sibling tokens, and form labels.
- Prefer `redactUSEID()` before logging or storing signatures outside short-lived debug paths.
- Log stable operational fields such as `resolved`, `abstentionReason`, `confidence`, `scores`, `scoreGap`, candidate count, threshold, margin, and signature hash.
- Avoid logging raw unresolved candidate names by default; use raw explanations only in controlled debug/support contexts.
- Use redacted production log shapes for browser-harness grounding events. Keep raw `explainResolution()` output limited to local debugging or controlled support bundles.

### Browser-harness alignment

- Added docs for the snapshot boundary a browser harness must provide: current URL, DOM snapshot, accessibility snapshot, and optional frame path.
- Added a grounding-gate example that resolves before click/fill-style actions and records confidence, score gap, abstention reason, and score bands without raw candidate names.
- Clarified that README examples target the current branch or future release artifact, not the npm `latest` package while `latest` remains `0.1.0`.
- Documented the current fixed `1024x768` spatial normalization limit so browser-harness adopters do not mistake it for a browser viewport matrix.
- Confirmed the release scope is `learn-from` only: no browser-harness dependency, backend, runtime bridge, or required browser runtime.

## [0.2.0] - 2026-04-02

Local release baseline for the current branch. This version is not the npm `latest` at the time of the 1.0.0 planning work.

### Added

- clearer grounding-gate documentation and repo-local example
- capture fingerprint support and richer resolution explainability
- stronger extractor, matcher, resolver, and safety coverage
- release verification and npm package metadata improvements

### Changed

- kept the product narrowly focused on safe grounding and abstention
- improved candidate generation and structural scoring for repeated or shifted elements
- clarified current support matrix and honest abstention cases
