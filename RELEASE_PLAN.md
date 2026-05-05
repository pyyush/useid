# uSEID 1.0.0 Release Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans` to implement this plan task-by-task. This plan is Phase 2 only; do not begin implementation from this document until Phase 3 is explicitly authorized.

**Goal:** Ship `@pyyush/useid@1.0.0` as a stable, secure grounding gate for browser agents: build portable signatures, resolve only when confidence is justified, and abstain clearly when it is not.

**Architecture:** Keep uSEID narrow. The package remains a TypeScript/Node library with framework-agnostic DOM and accessibility snapshot inputs, a signature builder, candidate/scoring pipeline, safety gate, and explanation/redaction surfaces. Browser-harness alignment is docs/examples/design alignment only; no browser-harness dependency, backend, required runtime, or bridge is in scope without human confirmation.

**Tech Stack:** TypeScript, Zod, tsup, Vitest, npm lockfile workflow, GitHub Actions on Node 20/22.

---

## Target Version

Target release: `1.0.0`.

Semver justification:

- npm latest verified during this phase: `@pyyush/useid@0.1.0`.
- Local audit baseline after the release-hardening checkpoint was `0.2.0`; the current release branch is aligned at `1.0.0-rc.1`.
- The mission is a stable, secure, valuable major release, and the audit identifies public API decisions that should be finalized before a stable contract.
- Pre-1.0 changes may break or tighten API semantics. Once result schemas, abstention reasons, config behavior, support claims, and release distribution are stable, the correct semver target is `1.0.0`.

The first RC is published as `1.0.0-rc.1` under the npm `rc` dist-tag. This plan still targets the final stable major release.

RC version policy:

- The first RC bump set `package.json` and `package-lock.json` together to `1.0.0-rc.1`, committed that change, and tagged the same commit as `v1.0.0-rc.1`.
- Later RCs use `1.0.0-rc.2`, `1.0.0-rc.3`, and so on.
- The release workflow rejects any tag/package mismatch, accepts only stable `x.y.z` or RC `x.y.z-rc.N` versions, publishes RCs under the npm `rc` dist-tag, and marks RC GitHub releases as prereleases.
- Final stable release uses `1.0.0`, tag `v1.0.0`, npm dist-tag `latest`, and a non-prerelease GitHub release.

Remote release-owner evidence:

- Remote GitHub settings for `pyyush/useid` are enabled: `main` requires one review, CODEOWNERS review, stale review dismissal, conversation resolution, linear history, no force-push/delete, admin enforcement, and status contexts `test (20)` and `test (22)`.
- Dependabot vulnerability alerts/security updates, secret scanning, push protection, and private vulnerability reporting are enabled.
- Local npm identity evidence: `npm whoami` reports `pyyush`.

## Cycle Estimate Model

One cycle means one focused implementation pass with tests, docs where relevant, and local verification. Larger tasks may need multiple cycles because they touch API, tests, docs, and release workflow together.

## Ordered Task List

| Order | Task | DoD Tags | Est. Cycles | Depends On | Deliverable |
|---:|---|---|---:|---|---|
| 1 | Reconcile release baseline and dirty worktree ownership | Repo hygiene, Release & distribution | 1 | none | Complete: ownership map recorded 2026-05-04 |
| 2 | Fix redaction privacy bug and diagnostics sensitivity | Security, Stability, Observability | 1 | 1 | Complete: redacted hash no longer uses stripped context fields |
| 3 | Lock stable result and config contracts | API quality, Stability, Observability | 2 | 1 | Complete: enum reasons, bounded scores/confidence, normalized weights |
| 4 | Harden extraction and matching behavior for safe abstention | Value, Stability, Tests | 2 | 3 | Complete: safer DOM/a11y matching limits, role drift behavior, ambiguity fixtures |
| 5 | Add realistic snapshot fixture coverage | Value, Tests, Browser-harness research | 2 | 3, 4 | Complete: fixtures for UI churn, duplicates, missing role/name, iframe, shadow limits |
| 6 | Add performance budgets and hot-path checks | Performance, Tests | 1 | 4, 5 | Complete: Vitest budgets for large extraction, scoring, and built bundle size |
| 7 | Resolve npm audit and package metadata drift | Security, Release & distribution, Repo hygiene | 1 | 1 | Complete: audit clean, lockfile package name aligned, package contents verified |
| 8 | Update public docs, examples, and browser-harness-facing guides | Docs, Value, Observability, Browser-harness research | 2 | 2, 3, 5 | README/API/migration/privacy/support docs plus browser-harness alignment docs |
| 9 | Tighten CI/release hygiene without locking browser matrix | Repo hygiene, Release & distribution, Tests | 1 | 5, 7 | Release checks catch internal files and run required gates on Node 20/22 |
| 10 | Run RC gate and external validation | Release & distribution, Value, Stability, Docs | 1 | 2-9 | Release candidate evidence and external-user feedback |
| 11 | Final release gate and publish | Release & distribution, Security, Repo hygiene | 1 | 10 | `v1.0.0` tag, npm publish, GitHub release |

Total estimate: 15 cycles.

## Task Details

### Task 1: Reconcile Release Baseline And Dirty Worktree Ownership

**DoD:** Repo hygiene, Release & distribution

**Status:** Complete for Phase 3 Task 1 on 2026-05-04. This completes the planning/ownership reconciliation only; it does not authorize broad cleanup or source changes outside the next assigned task.

**Files likely touched in Phase 3:** no product files required unless orchestrator assigns ownership; current dirty files include package files, workflows, source, tests, README, `CHANGELOG.md`, `examples/`, and `src/fingerprint.ts`.

**Plan:**

- Capture fresh `git status --short`.
- Identify which dirty files are pre-existing implementation work versus release-plan work.
- Ask the orchestrator before modifying any file already dirty from another worker.
- Keep `AUDIT.md` and `RELEASE_PLAN.md` as planning artifacts unless the orchestrator says otherwise.
- Do not revert, overwrite, or clean up unrelated edits.

**Exit criteria:**

- Phase 3 starts with a clear file ownership map.
- No unowned dirty work is overwritten.

**Fresh status captured:**

```text
 M .github/workflows/release.yml
 M .gitignore
 M README.md
 M package-lock.json
 M package.json
 M src/__tests__/builder.test.ts
 M src/__tests__/extractor.test.ts
 M src/__tests__/matcher.test.ts
 M src/__tests__/resolver.test.ts
 M src/__tests__/safety.test.ts
 M src/__tests__/types.test.ts
 M src/builder.ts
 M src/candidate.ts
 M src/extractor.ts
 M src/index.ts
 M src/matcher.ts
 M src/resolver.ts
 M src/safety.ts
 M src/types.ts
?? AUDIT.md
?? CHANGELOG.md
?? RELEASE_PLAN.md
?? examples/
?? src/fingerprint.ts
```

**Diff metadata inspected:**

- Tracked dirty files: 19 files, 677 insertions, 107 deletions.
- Untracked files: `AUDIT.md`, `CHANGELOG.md`, `RELEASE_PLAN.md`, `examples/grounding-gate.ts`, `src/fingerprint.ts`.
- Task 2-relevant dirty files inspected directly: `src/resolver.ts`, `src/__tests__/resolver.test.ts`, `src/fingerprint.ts`.
- Later-task dirty metadata inspected for package/workflow/docs/source/test groups.

**Ownership map:**

| Category | Files | Ownership rule |
|---|---|---|
| Planning files owned by this agent | `RELEASE_PLAN.md`; prior audit artifact `AUDIT.md` | May update `RELEASE_PLAN.md` for task tracking. Do not edit `AUDIT.md` unless explicitly asked. |
| Needed for Task 2 redaction privacy fix | `src/resolver.ts`, `src/fingerprint.ts`, `src/__tests__/resolver.test.ts` | These files are already dirty/untracked from pre-existing work. Task 2 may patch them additively and narrowly, preserving existing changes. Do not rewrite or revert current hunks. |
| Possible Task 2 docs follow-up, not for the next unit unless requested | `README.md` | Dirty and unowned. Do not touch during the Task 2 code/test fix unless the user explicitly includes docs in that unit. |
| Later API contract tasks | `src/types.ts`, `src/constants.ts`, `src/matcher.ts`, `src/safety.ts`, `src/resolver.ts`, `src/index.ts`, `src/__tests__/types.test.ts`, `src/__tests__/matcher.test.ts`, `src/__tests__/safety.test.ts`, `src/__tests__/resolver.test.ts` | Relevant to Tasks 3-4. Treat current edits as pre-existing; modify only when the corresponding task is authorized. |
| Later extraction/fixture tasks | `src/extractor.ts`, `src/builder.ts`, `src/candidate.ts`, `src/__tests__/builder.test.ts`, `src/__tests__/extractor.test.ts`, optional future fixtures | Relevant to Tasks 4-5. Do not touch during Task 2. |
| Later release/security/hygiene tasks | `package.json`, `package-lock.json`, `.github/workflows/release.yml`, `.gitignore` | Relevant to Tasks 7 and 9. Do not touch until toolchain/package/workflow changes are explicitly authorized. |
| Later public docs/examples tasks | `README.md`, `CHANGELOG.md`, `examples/grounding-gate.ts` | Relevant to Task 8. Do not touch during Task 2 unless that task is widened. |
| Do not touch yet | all dirty files not explicitly assigned in the current task | Preserve as pre-existing/unowned changes. |

**Commit constraints:**

- Do not commit during Task 1.
- Future commits must stage only files authorized for the active task.
- Do not sweep unrelated dirty files into a commit.
- Do not clean, revert, reformat, or regenerate pre-existing dirty files unless the active task explicitly requires it.
- For Task 2, the safe commit scope is expected to be `src/resolver.ts`, `src/fingerprint.ts`, and `src/__tests__/resolver.test.ts` only, plus `RELEASE_PLAN.md` if task status is updated.

**Planning-only verification:**

- `npm test`: passed, 7 test files and 124 tests.
- `npm audit --json`: failed with the known 2 vulnerabilities: high transitive `vite` and moderate transitive `postcss`. This remains a Task 7 release/security blocker.

### Task 2: Fix Redaction Privacy Bug And Diagnostics Sensitivity

**DoD:** Security, Stability, Observability

**Status:** Complete for Phase 3 Task 2 on 2026-05-04. The implementation was limited to `src/fingerprint.ts` and `src/__tests__/resolver.test.ts`; diagnostics docs remain planned for Task 8.

**Files likely touched in Phase 3:**

- `src/resolver.ts`
- `src/fingerprint.ts`
- `src/__tests__/resolver.test.ts`
- README/privacy docs if docs are in scope for that implementation unit

**Plan:**

- Add a failing test proving `redactUSEID()` recomputes hash without original `formAssociation`.
- Fix the override path so explicit redaction does not fall back through `??` to original form labels.
- Add test coverage for accessible description, sibling tokens, and form association redaction together.
- Decide whether unresolved candidate diagnostics need a redacted display helper or explicit docs warning.

**Exit criteria:**

- Redacted signatures do not encode original accessible names, descriptions, sibling tokens, or form associations.
- Tests fail before the fix and pass after the fix.

**Verification:**

- RED regression: `npm test -- src/__tests__/resolver.test.ts -t "should compute redacted hash without redacted context fields"` failed before the fix because redacted hashes still differed when only stripped context fields differed.
- GREEN regression: the same targeted test passed after the fix.
- `npm run build`: passed.
- `npm run typecheck`: passed.
- `npm test`: passed, 7 test files and 125 tests.
- `npm audit --json`: failed with the pre-existing 2 vulnerabilities: high transitive `vite` and moderate transitive `postcss`. This remains assigned to Task 7.

### Task 3: Lock Stable Result And Config Contracts

**DoD:** API quality, Stability, Observability

**Status:** Complete for Phase 3 Task 3 on 2026-05-04. Stable abstention reasons are now represented by a schema/type, public result scores/confidence are schema-bounded to 0-1, and custom scoring weights are rejected unless they sum to 1.

**Files likely touched in Phase 3:**

- `src/types.ts`
- `src/constants.ts`
- `src/matcher.ts`
- `src/safety.ts`
- `src/resolver.ts`
- `src/index.ts`
- relevant tests

**Plan:**

- Replace unconstrained `abstentionReason: string` with a stable enum type/schema.
- Enforce or normalize confidence and score ranges so public results stay within the documented 0-1 contract.
- Decide and document custom-weight behavior: reject non-normalized weights or normalize them consistently.
- Decide which lower-level exports are stable public API for `1.0.0`.
- Add schema and behavior tests for exhaustive result handling and invalid config.

**Exit criteria:**

- Downstream consumers can exhaustively switch on abstention reasons.
- Invalid config fails predictably.
- Scores and confidence cannot exceed documented ranges.

**Verification:**

- RED contract tests: focused `types`, `matcher`, and `safety` tests failed before implementation on missing abstention reason schema/export, unbounded result schemas, and accepted non-normalized weights.
- GREEN contract tests: focused `types`, `matcher`, and `safety` tests passed after implementation.
- `npm run build`: passed.
- `npm run typecheck`: passed.
- `npm test`: passed, 7 test files and 136 tests.
- `npm audit --json`: failed with the pre-existing 2 vulnerabilities: high transitive `vite` and moderate transitive `postcss`. This remains assigned to Task 7.

### Task 4: Harden Extraction And Matching Behavior For Safe Abstention

**DoD:** Value, Stability, Tests

**Status:** Complete for Phase 3 Task 4 on 2026-05-04. Same-role candidate generation remains the safe default; missing accessible-name evidence no longer earns semantic confidence, and DOM geometry is not borrowed from same-tag DOM nodes when text/label evidence conflicts with the accessibility name. The fixed 1024x768 spatial normalization remains a tested limitation to document in Task 8 rather than a locked browser/toolchain decision.

**Files likely touched in Phase 3:**

- `src/extractor.ts`
- `src/candidate.ts`
- `src/matcher.ts`
- `src/safety.ts`
- relevant tests

**Plan:**

- Preserve same-role candidate generation as the safe default.
- Add focused tests for role drift, missing accessible names, duplicate names, incomplete DOM layout, and DOM/a11y mismatch.
- Improve extractor matching where safe, but prefer explicit abstention over broad fallback behavior.
- Review hardcoded viewport behavior and either make it configurable or document and test the current limit honestly.

**Exit criteria:**

- Ambiguous or weak evidence abstains with a clear reason.
- Matching improvements do not relax the "wrong element is worse than no element" rule.

**Verification:**

- RED regression: focused extractor/matcher/safety tests failed before implementation on DOM/a11y text mismatch geometry assignment and missing accessible-name semantic over-scoring.
- GREEN regression: `npm test -- src/__tests__/extractor.test.ts src/__tests__/matcher.test.ts src/__tests__/safety.test.ts` passed, 3 test files and 57 tests.
- `npm run build`: passed.
- `npm run typecheck`: passed.
- `npm test`: passed, 7 test files and 143 tests.
- `npm audit --json`: failed with the pre-existing 2 vulnerabilities: high transitive `vite` and moderate transitive `postcss`. This remains assigned to Task 7.

### Task 5: Add Realistic Snapshot Fixture Coverage

**DoD:** Value, Tests, Browser-harness research

**Status:** Complete for Phase 3 Task 5 on 2026-05-04. Added fixture-backed coverage for wrapper/layout churn, duplicate same-role same-name ambiguity, missing role/name abstention, same-origin iframe `framePath` binding, representable open shadow DOM support, and closed shadow DOM abstention when DOM/layout evidence is unavailable. No production source changes were required.

**Files likely touched in Phase 3:**

- `src/__tests__/`
- optional fixture directory under `src/__tests__/fixtures/` or `test/fixtures/`
- README/support docs if docs are in scope for that implementation unit

**Plan:**

- Add fixtures for same target under wrapper/layout churn.
- Add duplicate same-role/same-name fixture that must abstain or require sufficient margin.
- Add missing role/name fixture that must abstain.
- Add same-origin iframe binding fixture using `framePath`.
- Add open shadow DOM support fixture if representable from current snapshot model.
- Add closed shadow DOM limitation fixture or docs-backed abstention case.

**Exit criteria:**

- README support claims are backed by tests or explicitly labeled as limits.
- Fixture names map clearly to support-matrix rows.

**Verification:**

- Fixture regression: `npm test -- src/__tests__/realistic-fixtures.test.ts` passed, 1 test file and 6 tests.
- `npm run build`: passed.
- `npm run typecheck`: passed.
- `npm test`: passed, 8 test files and 149 tests.
- `npm audit --json`: failed with the pre-existing 2 vulnerabilities: high transitive `vite` and moderate transitive `postcss`. This remains assigned to Task 7.

### Task 6: Add Performance Budgets And Hot-Path Checks

**DoD:** Performance, Tests

**Status:** Complete for Phase 3 Task 6 on 2026-05-04. Added deterministic Vitest budget coverage for large DOM/accessibility extraction, many same-role candidate scoring, and built bundle artifact size. Initial extraction budget failed before implementation at 600 controls, which justified a narrow extractor optimization: DOM nodes are now indexed by tag plus exact text/label name while duplicate exact-name DOM matches remain ambiguous.

**Files likely touched in Phase 3:**

- benchmark or test file under the repo's existing test structure
- `package.json` only if the implementation unit permits adding a script
- README/performance docs if docs are in scope

**Plan:**

- Measure extraction on a large accessibility tree and DOM snapshot fixture.
- Measure matching with many same-role candidates.
- Track bundle size from `dist/index.js` and `dist/index.cjs`.
- Consider caching normalized names/tokens only if benchmark evidence shows it matters.
- Avoid adding browser runtime dependencies for performance tests unless separately approved.

**Exit criteria:**

- Release has explicit performance evidence.
- Hot-path regressions are visible before publishing.

**Initial budgets:**

- Large extraction: 600 accessible buttons with matching DOM/layout evidence must extract within 2,000 ms.
- Same-role scoring: 2,500 button candidates must score and sort within 1,500 ms.
- Bundle size after `npm run build`: `dist/index.js` must stay <= 75,000 raw bytes, `dist/index.cjs` must stay <= 85,000 raw bytes, and combined gzip size must stay <= 45,000 bytes.
- Current build sizes: `dist/index.js` 31,678 raw bytes / 8,281 gzip bytes; `dist/index.cjs` 35,101 raw bytes / 8,990 gzip bytes; combined gzip 17,271 bytes.

**Verification:**

- RED budget: `npm test -- src/__tests__/performance-budget.test.ts` failed before the extractor optimization because 600-element extraction took 2,259 ms against a 2,000 ms budget.
- GREEN budget: `npm test -- src/__tests__/performance-budget.test.ts` passed, 1 test file and 3 tests.
- `npm run build`: passed.
- `npm run typecheck`: passed.
- `npm test`: passed, 9 test files and 152 tests.
- `npm audit --json`: failed with the pre-existing 2 vulnerabilities: high transitive `vite` and moderate transitive `postcss`. This remains assigned to Task 7.

### Task 7: Resolve npm Audit And Package Metadata Drift

**DoD:** Security, Release & distribution, Repo hygiene

**Status:** Complete for Phase 3 Task 7 on 2026-05-04. Captured the starting audit failure and package metadata drift, then fixed both with lockfile-only dependency movement. `package.json` remains at the local release baseline `@pyyush/useid@0.2.0`; `package-lock.json` now has top-level and root package metadata aligned to `@pyyush/useid@0.2.0`.

**Files likely touched in Phase 3:**

- `package.json`
- `package-lock.json`

**Plan:**

- Update transitive dev tooling through npm after orchestrator approval for toolchain changes.
- Confirm `npm audit --json` reports zero known vulnerabilities.
- Align `package-lock.json` root name with `@pyyush/useid`.
- Verify `npm pack --dry-run` includes intended public files only.

**Exit criteria:**

- Audit clean or explicitly risk-accepted by a human.
- Package metadata matches npm scope and release target.

**Captured baseline:**

- Starting `npm audit --json`: 2 vulnerabilities, high transitive `vite` and moderate transitive `postcss`.
- Starting metadata: `package.json` was `@pyyush/useid@0.2.0`; `package-lock.json` top-level/root package metadata was `useid@0.2.0`.

**Fix:**

- Ran `npm update vite postcss --package-lock-only`.
- Lockfile now resolves `vite@8.0.10` and `postcss@8.5.13`.
- Lockfile top-level and root package metadata now match `@pyyush/useid@0.2.0`.
- No `package.json` edits were required for this task.

**Verification:**

- `npm run build`: passed.
- `npm run typecheck`: passed.
- `npm test`: passed, 9 test files and 152 tests.
- `npm audit --json`: passed with 0 vulnerabilities.
- `npm pack --dry-run`: passed for `@pyyush/useid@0.2.0`, package size 34.0 kB, unpacked size 147.1 kB, total files 8.

### Task 8: Update Public Docs, Examples, And Browser-Harness-Facing Guides

**DoD:** Docs, Value, Observability, Browser-harness research

**Status:** Complete for Phase 3 Task 8 on 2026-05-04. README, changelog, and the grounding-gate example now cover the current release status, 0.1.0 -> 1.0.0 migration notes, privacy/security handling, observability/debug guidance, and browser-harness learn-from usage without adding any browser-harness dependency, backend, runtime bridge, or required runtime.

**Files likely touched in Phase 3:**

- `README.md`
- `CHANGELOG.md`
- `examples/grounding-gate.ts`
- possible new docs files if public docs scope is approved

**Plan:**

- Align README version/support text with the actual release target.
- Add migration notes from published `0.1.0` to `1.0.0`.
- Add security/privacy guidance for snapshot-derived text, redaction, and candidate diagnostics.
- Add observability guidance for logging confidence, abstention reasons, score gaps, and redacted explanations.
- Add browser-harness-facing grounding example that resolves a target only after uSEID confidence/abstention gating.
- Document the snapshot boundary needed to drive uSEID from browser-harness CDP access, including strong-fit and abstain cases.
- Add an interop guide mapping browser-harness actions to uSEID-safe resolution steps so teams can adopt safety gating without a custom contract.

**Exit criteria:**

- A browser-agent builder can understand when to act, when to abstain, and what evidence is required.
- Browser-harness content is framed as design/docs/examples alignment, not a runtime integration.

**Verification:**

- `npm run build`: passed.
- `npm run typecheck`: passed.
- `npm test`: passed, 9 test files and 152 tests.
- `npm audit --json`: passed with 0 vulnerabilities.
- `npm pack --dry-run`: passed for `@pyyush/useid@0.2.0`, 8 files.
- `npx tsc --noEmit --target ES2022 --module NodeNext --moduleResolution NodeNext --strict --skipLibCheck examples/grounding-gate.ts`: passed.

### Task 9: Tighten CI And Release Hygiene Without Locking Browser Matrix

**DoD:** Repo hygiene, Release & distribution, Tests

**Status:** Complete for Phase 3 Task 9 on 2026-05-04. Release verification now runs on the existing Node 20/22 matrix with build, typecheck, full Vitest, explicit performance-budget tests, clean `npm audit --json`, package-content inspection, and provenance publish gating. No browser CI matrix, browser-harness dependency, browser runtime dependency, browser version lock, Playwright/Puppeteer dependency, or build-tool matrix was added.

**Files likely touched in Phase 3:**

- `.github/workflows/ci.yml`
- `.github/workflows/release.yml`
- `.gitignore`
- package metadata only if implementation scope permits

**Plan:**

- Keep current baseline: npm lockfile workflow, tsup build, TypeScript typecheck, Vitest tests, Node 20/22 CI matrix.
- Improve release hygiene checks for internal-only files if needed.
- Do not add a browser CI matrix until orchestrator reconciles useid with dbar's audit/plan.
- If adding lint/format is approved, keep it minimal and consistent with existing TypeScript tooling.

**Checklist:**

- [x] Preserved npm lockfile workflow with `npm ci`.
- [x] Preserved tsup build, TypeScript typecheck, Vitest tests, and Node 20/22 CI/release verification baseline.
- [x] Added release hygiene checks for internal-only repository and package contents.
- [x] Added explicit release gate coverage for performance-budget tests and clean `npm audit --json`.
- [x] Kept local `release:verify` aligned with build, typecheck, tests, performance budget, audit, and pack dry-run gates.
- [x] Kept browser matrix and browser-harness/runtime dependency work out of scope.

**Exit criteria:**

- CI/release gates are reliable for the current Node baseline.
- Browser matrix remains proposed, not locked.

**Verification:**

- `npm run build`: passed; tsup produced ESM, CJS, and DTS artifacts.
- `npm run typecheck`: passed.
- `npm test`: passed, 9 test files and 152 tests.
- `npm audit --json`: passed with 0 vulnerabilities.
- `npm pack --dry-run`: passed for `@pyyush/useid@0.2.0`, 8 files, package size 37.0 kB.
- Workflow YAML parse: passed for `.github/workflows/ci.yml` and `.github/workflows/release.yml`.

### Task 10: Run RC Gate And External Validation

**DoD:** Release & distribution, Value, Stability, Docs

**Status:** In progress for Phase 3 Task 10 on 2026-05-04. `@pyyush/useid@1.0.0-rc.1` has been published through the release workflow, but Task 10 is not complete because no external or external-like user validation has occurred.

**Current RC gate status:**

- Local release verification gate: latest full `npm run release:verify` passed on 2026-05-05 after PR #3 remediation.
- Timing note: the first `npm run release:verify` attempt failed in the focused performance-budget step because 600-element extraction took about 2531 ms against the 2000 ms budget. A focused rerun of `npm test -- src/__tests__/performance-budget.test.ts` passed, and a second full `npm run release:verify` passed. Treat the extraction budget as timing-sensitive evidence to watch in CI/RC.
- Public npm latest: registry reports `@pyyush/useid@0.1.0` under the `latest` dist-tag.
- Public npm RC: registry reports `@pyyush/useid@1.0.0-rc.1` under the `rc` dist-tag.
- Local package: current release branch package metadata is `@pyyush/useid@1.0.0-rc.1`.
- PR #3 review remediation: release workflow policy checks now run in the `verify` job and again immediately before `npm publish`; the local policy script asserts both placements.
- PR #3 review remediation: packaged README/CHANGELOG describe `1.0.0-rc.1` as the current RC and narrow runtime support to the Node 20/22 tested matrix.
- Stable release target in this plan: `1.0.0`; it is not published.
- Version alignment policy: RC commits set `package.json` and `package-lock.json` to `1.0.0-rc.N`; the final release commit sets both to `1.0.0`. The release workflow requires the tag version to exactly match package metadata.
- RC naming policy: use npm SemVer `1.0.0-rc.N` and Git tag `v1.0.0-rc.N`. RC publishes use npm dist-tag `rc` and GitHub prereleases; stable publishes use npm dist-tag `latest` and normal GitHub releases.
- Confirmed remote settings: branch protection, required `test (20)`/`test (22)` contexts, CODEOWNERS review, Dependabot security, secret scanning/push protection, private vulnerability reporting, and npm identity `pyyush` are now recorded as enabled evidence rather than blockers.
- Package dry-run contents: 8 files only: `CHANGELOG.md`, `LICENSE`, `README.md`, `dist/index.cjs`, `dist/index.d.cts`, `dist/index.d.ts`, `dist/index.js`, and `package.json`.
- Internal package-content check: no `AGENTS.md`, `CLAUDE.md`, `AUDIT.md`, `RELEASE_PLAN.md`, `RC_VALIDATION.md`, `docs/plans`, `.omx`, `.bap`, `.banners`, `coverage`, `examples`, or `src` files were included in the dry-run package.

**Plan:**

- Cut follow-up RCs only after local and CI gates pass.
- Before tagging a follow-up RC, run `npm version 1.0.0-rc.N --no-git-tag-version`, review the `package.json` and `package-lock.json` version-only diff, commit it, and tag the exact commit as `v1.0.0-rc.N`.
- Run package install/import checks from a clean external sample project.
- Ask at least one external or external-like browser-agent user to validate the grounding-gate docs/example.
- Record feedback and decide whether it blocks `1.0.0`.

**Concrete blockers before Task 10 can complete:**

- At least one external or external-like RC user is required; none has validated the package/docs/example yet.

**Required external-user evidence fields:**

- Validator name or role:
- Date:
- RC artifact used, version, and install source:
- Clean sample project or host environment:
- Import/API smoke result:
- Grounding-gate docs/example reviewed:
- Strong-fit scenario result:
- Abstention/ambiguous scenario result:
- Package contents or security concerns:
- Feedback summary:
- Release-blocking disposition:
- Follow-up owner:

**Local verification:**

- `npm run release:verify`: passed on 2026-05-05 after PR #3 remediation; included release policy, build, typecheck, full Vitest, focused performance budgets, `npm audit --json`, and `npm pack --dry-run`.
- `npm test`: passed, 9 test files and 152 tests.
- `npm audit`: passed with 0 vulnerabilities.
- `npm pack --dry-run`: passed for `@pyyush/useid@1.0.0-rc.1`, package size 37.2 kB, unpacked size 157.1 kB, 8 files.
- Package internal-file assertion from the `release:verify` dry-run JSON: passed with an empty forbidden-file list.
- `npm view @pyyush/useid version --json`: `0.1.0`.
- `npm view @pyyush/useid dist-tags --json`: `{ "latest": "0.1.0", "rc": "1.0.0-rc.1" }`.
- `npm view @pyyush/useid@1.0.0-rc.1 dist.tarball dist.integrity dist.shasum --json`: tarball `https://registry.npmjs.org/@pyyush/useid/-/useid-1.0.0-rc.1.tgz`, integrity `sha512-G8wvm6PIQlIH0rvhLJNC43pRiGfsKQHiTqyC73YKnhzzlKaZ0aA6ewZDeF73Asds1la7t9s4HgKinBwcfVhxuA==`, shasum `e35a3a16386110137f8e116435be9bf9858636c9`.
- Release workflow `v1.0.0-rc.1`: passed at `https://github.com/pyyush/useid/actions/runs/25339009937`.
- GitHub prerelease: `https://github.com/pyyush/useid/releases/tag/v1.0.0-rc.1`.
- Local package metadata inspection: `@pyyush/useid@1.0.0-rc.1`, `publishConfig.access` is `public`, registry is `https://registry.npmjs.org/`.
- Release policy check: local `release:verify` now asserts package/package-lock name/version alignment, release-workflow prerelease policy, and policy-script placement in both `verify` and immediately before `npm publish`.

**Exit criteria:**

- RC evidence exists.
- External validation is complete or explicitly waived by a human.

### Task 11: Final Release Gate And Publish

**DoD:** Release & distribution, Security, Repo hygiene

**Status:** Blocked until Task 10 passes.

**Plan:**

- Verify `npm ci`, `npm run build`, `npm run typecheck`, `npm test`, coverage, `npm audit`, and `npm pack --dry-run`.
- Confirm package version and tag are `1.0.0`.
- Publish with npm provenance through the release workflow.
- Create a GitHub release with clear release notes and known limits.

**Exit criteria:**

- npm latest is `@pyyush/useid@1.0.0`.
- GitHub release exists.
- Known support limits and browser-harness non-integration scope are documented.

## Dependencies

- Task 1 originally blocked implementation because the worktree was dirty; the release-hardening checkpoint is now clean, so only scoped RC version-bump work should be added before tagging.
- Task 3 should land before Tasks 4, 5, and 8 because stable schemas and result contracts affect tests and docs.
- Task 2 should land before docs and release validation because privacy behavior must not be documented around a known bug.
- Task 5 depends on Tasks 3 and 4 so fixtures assert final API and safety behavior.
- Task 8 depends on Tasks 2, 3, and 5 so docs match fixed behavior and fixture-backed support claims.
- Task 10 depends on Tasks 2-9.
- Task 11 depends on Task 10.

## Risks And Blockers

Current blockers for release:

- Public npm latest is `0.1.0`, while the published RC is `1.0.0-rc.1` and the stable target remains `1.0.0`.
- At least one external or external-like RC user still needs to validate the package/docs/example.
- Performance-budget timing was sensitive during local RC prep: one focused extraction-budget run failed before subsequent focused and full-gate reruns passed.

Risks to manage:

- API tightening could break current local examples or downstream pre-1.0 users.
- Browser support matrix work could expand into browser orchestration; keep it as evidence/docs unless orchestrator approves more.
- Adding browser-harness as a dependency would materially change scope and cross-language maintenance burden.
- Toolchain updates for audit fixes may alter Vitest/Vite behavior; route material Node/browser/build-tool matrix changes back to the orchestrator.
- Redacted diagnostics can reduce debug value; preserve operator usefulness without leaking snapshot-derived text.

## Browser-Harness Research Outcome

Orchestrator-approved decision for useid: `learn-from`.

Approved next-release scope:

- Docs/examples/design alignment only.
- No browser-harness package dependency.
- No backend or required runtime.
- No formal runtime bridge without human confirmation.

Approved actions to plan:

1. Add a browser-harness-facing grounding example that resolves a target only after uSEID confidence/abstention gating.
2. Document the snapshot boundary needed to drive uSEID from browser-harness CDP access, including strong-fit and abstain cases.
3. Add an interop guide mapping browser-harness actions to uSEID-safe resolution steps so teams can adopt safety gating without a custom contract.

Scope flag:

- A formal runtime bridge or hard browser-harness integration would materially change scope and timeline and requires human confirmation before acting.

## Browser And Toolchain Matrix

Current baseline:

- Package manager: npm lockfile workflow.
- Build: tsup.
- Typecheck: TypeScript `tsc --noEmit`.
- Tests: Vitest in Node environment.
- Runtime engine: Node `^20.0.0 || ^22.0.0`.
- CI matrix: Node `20` and `22`.
- No explicit browser execution matrix exists in CI today.

Candidate browser CI options for orchestrator/dbar reconciliation:

- Minimal evidence option: Node 20/22 plus Chromium stable snapshot smoke fixtures.
- Support-matrix option: Chromium stable fixtures for main frame, same-origin iframe, open shadow DOM, and closed shadow DOM abstention documentation.
- Shared-browser-constraints option: adopt a dbar-aligned browser version policy only after the orchestrator reconciles both release plans.
- Future compatibility option: evaluate Node 24 only after release-critical audit and dbar/browser constraints are resolved.

Decision:

- Keep Node 20/22 as the current release-planning baseline.
- Do not lock any browser CI matrix, browser version, Playwright/Puppeteer dependency, browser-harness dependency, or build-tool matrix in this plan.

## Release Gates

### Implementation Gate

Status: Local preparation evidence exists from Tasks 2-10, with the latest `npm run release:verify` passing after PR #3 remediation. CI confirmation is still required for follow-up release changes.

Required evidence:

- `npm ci`
- `npm run build`
- `npm run typecheck`
- `npm test`
- coverage report
- `npm audit`
- `npm pack --dry-run`
- targeted fixture/performance checks added by this plan

### RC Gate

Status: Passed for `1.0.0-rc.1`; blocked only for follow-up RCs if release-blocking feedback requires another candidate.

Required evidence:

- `1.0.0-rc.1` package reviewed from the release workflow artifact and npm registry metadata.
- API and package contents reviewed.
- README, changelog, migration notes, support limits, and browser-harness docs/examples reviewed.
- Known bugs and accepted limitations documented.

### External-User Gate

Status: Blocked until at least one external or external-like validator runs `1.0.0-rc.1`.

Required evidence:

- At least one external or external-like browser-agent builder validates the grounding-gate example and docs.
- Feedback is recorded with explicit release-blocking/non-blocking disposition.
- Any waived external validation requires human confirmation.

### Final Release Gate

Status: Blocked until external-user gate passes or is waived by a human.

Required evidence:

- Clean release branch/worktree except intended release artifacts.
- CI green on Node 20/22.
- Security audit clean or human risk acceptance recorded.
- npm provenance workflow and npm identity evidence recorded; actual publish evidence still required.
- GitHub release notes include support matrix, known limits, and browser-harness scope boundary.

## Definition Of Done Delta

Remaining release delta after Task 10 local preparation:

- External or external-like validation against `1.0.0-rc.1`.
- Follow-up RC only if release-blocking feedback requires one.
- Final publish/release evidence after the RC and external-user gates pass.

## Phase 3 Starting Point

Phase 3 task 1 should be: reconcile release baseline and dirty worktree ownership, then fix the redaction privacy bug with tests if the orchestrator confirms file ownership.
