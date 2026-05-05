# uSEID RC Validation Handoff

This handoff validates `@pyyush/useid@1.0.0-rc.1` before the stable `1.0.0` release. The RC exists on npm under the `rc` dist-tag and as a GitHub prerelease.

## Version And RC Naming Policy

The repository package version was bumped to `1.0.0-rc.1` in the RC version-bump commit and tagged as `v1.0.0-rc.1`. Later RCs use `1.0.0-rc.2`, `1.0.0-rc.3`, and so on. The release workflow rejects tags that do not exactly match `package.json`, accepts only stable `x.y.z` or RC `x.y.z-rc.N` versions, publishes RCs with the npm `rc` dist-tag, and marks RC GitHub releases as prereleases. The final stable release uses `1.0.0`, tag `v1.0.0`, npm dist-tag `latest`, and a non-prerelease GitHub release.

## RC Artifact

- RC version: `1.0.0-rc.1`
- npm dist-tag install: `npm install @pyyush/useid@rc`
- explicit npm version install: `npm install @pyyush/useid@1.0.0-rc.1`
- tarball URL: `https://registry.npmjs.org/@pyyush/useid/-/useid-1.0.0-rc.1.tgz`
- npm integrity: `sha512-G8wvm6PIQlIH0rvhLJNC43pRiGfsKQHiTqyC73YKnhzzlKaZ0aA6ewZDeF73Asds1la7t9s4HgKinBwcfVhxuA==`
- npm shasum: `e35a3a16386110137f8e116435be9bf9858636c9`
- Git tag: `v1.0.0-rc.1`
- GitHub prerelease: `https://github.com/pyyush/useid/releases/tag/v1.0.0-rc.1`
- Release workflow: `https://github.com/pyyush/useid/actions/runs/25339009937`

`latest` remains `0.1.0`; `rc` points at `1.0.0-rc.1`.

## Release Owner Evidence

Remote GitHub settings for `pyyush/useid` are enabled for the RC path: `main` requires one review, CODEOWNERS review, stale review dismissal, conversation resolution, linear history, no force-push/delete, admin enforcement, and status contexts `test (20)` and `test (22)`. Dependabot vulnerability alerts/security updates, secret scanning, push protection, and private vulnerability reporting are enabled. The local npm identity check currently reports `npm whoami` as `pyyush`.

## Install Source

Use one of these install commands in the clean validator project:

```bash
npm install @pyyush/useid@rc
npm install @pyyush/useid@1.0.0-rc.1
```

## Validator Setup

Use a clean Node project outside this repository:

```bash
mkdir useid-rc-smoke
cd useid-rc-smoke
npm init -y
npm install <INSTALL_SOURCE>
node --version
npm ls @pyyush/useid
```

Node must be `>=20.0.0`. Record the exact Node, npm, OS, and install source in the feedback section.

## Import And Grounding Smoke

Create `smoke-useid.mjs` in the clean sample project:

```js
import { buildUSEID, resolveUSEID, redactUSEID } from "@pyyush/useid";

function ax(tree) {
  return { tree, hash: "validator-ax", serialized: JSON.stringify(tree) };
}

function dom(snapshot = null) {
  return { snapshot, hash: "validator-dom", serialized: JSON.stringify(snapshot) };
}

const pageUrl = "https://example.com/checkout";
const baseTree = {
  role: "WebArea",
  name: "Checkout",
  children: [
    { role: "button", name: "Pay now" },
    { role: "button", name: "Cancel" },
  ],
};

const signature = buildUSEID({
  domSnapshot: dom(),
  accessibilitySnapshot: ax(baseTree),
  elementIndex: 0,
  pageUrl,
});

const strongFit = resolveUSEID({
  signature,
  domSnapshot: dom(),
  accessibilitySnapshot: ax(baseTree),
  pageUrl,
  config: { threshold: 0.3 },
});

if (!strongFit.resolved) {
  throw new Error(`expected strong-fit resolution, got ${strongFit.abstentionReason}`);
}

const bindingMismatch = resolveUSEID({
  signature,
  domSnapshot: dom(),
  accessibilitySnapshot: ax(baseTree),
  pageUrl: "https://evil.example/checkout",
});

if (bindingMismatch.resolved || bindingMismatch.abstentionReason !== "binding_mismatch") {
  throw new Error("expected binding_mismatch abstention");
}

const noCandidates = resolveUSEID({
  signature,
  domSnapshot: dom(),
  accessibilitySnapshot: ax({
    role: "WebArea",
    name: "Checkout",
    children: [{ role: "link", name: "Help" }],
  }),
  pageUrl,
});

if (noCandidates.resolved || noCandidates.abstentionReason !== "no_candidates") {
  throw new Error("expected no_candidates abstention");
}

const redacted = redactUSEID(signature);

if (redacted.semantic.accessibleName === signature.semantic.accessibleName) {
  throw new Error("expected redacted signature to remove the raw accessible name");
}

console.log({
  version: signature.version,
  selectorHint: strongFit.selectorHint,
  confidence: strongFit.confidence,
  abstentions: [bindingMismatch.abstentionReason, noCandidates.abstentionReason],
  redactedHash: redacted.hash,
});
```

Run it:

```bash
node smoke-useid.mjs
```

Pass criteria:

- The package installs without local source checkout hacks.
- `node smoke-useid.mjs` exits `0`.
- The strong-fit case resolves with a button selector hint.
- The cross-origin case abstains with `binding_mismatch`.
- The no-same-role case abstains with `no_candidates`.
- Redaction removes raw accessible names before logging/support use.

Fail criteria:

- Install fails from the provided RC source.
- ESM import fails on Node `>=20`.
- The strong-fit case abstains with the documented threshold.
- The mismatch or no-candidate cases resolve instead of abstaining.
- Raw accessible names remain in redacted signatures.

## Grounding-Gate Example Review

Review the repo-local example at `examples/grounding-gate.ts`. It is documentation/source-checkout material, not a published package entrypoint.

Ask the validator to confirm:

- The example keeps uSEID at the snapshot boundary and does not imply browser orchestration ownership.
- The host integration captures DOM and accessibility snapshots before acting.
- `resolveUSEID()` gates the action, and the host stops on every abstention reason.
- Logged diagnostics avoid raw candidate names and raw explanation text by default.
- The example is adaptable to their browser-agent or automation stack in under 30 minutes.

## Real-World Validation Scenario

Ask the validator to run one host-specific check in their own project or a representative sample:

1. Capture a signature for a real button or link before UI churn.
2. Re-run resolution after harmless wrapper/layout churn.
3. Confirm the intended element resolves only when confidence is justified.
4. Create an ambiguous or missing-target case.
5. Confirm uSEID abstains and the host does not click/type/act.

The validator does not need to adopt uSEID permanently. The goal is to prove install, import, grounding-gate semantics, and docs clarity.

## Feedback Capture

- Validator name or role:
- Organization/project type:
- Date:
- RC version:
- Install source:
- Source commit or tag: `v1.0.0-rc.1`
- Node/npm/OS:
- Clean sample project path or host environment:
- `npm ls @pyyush/useid` output:
- `node smoke-useid.mjs` result:
- Strong-fit scenario result:
- Abstention/ambiguous scenario result:
- Grounding-gate example path reviewed: `examples/grounding-gate.ts`
- Docs clarity notes:
- Security/privacy/package-content concerns:
- API naming/signature concerns:
- Performance or bundle-size concerns:
- Release-blocking issues:
- Non-blocking follow-ups:
- Validator disposition: `<pass|fail|pass-with-follow-ups>`
- uSEID owner disposition:
- Follow-up owner:

## Known Blockers

- At least one external or external-like validator must run the RC in their own project or representative sample.
- The local performance budget was timing-sensitive during RC prep; watch extraction-budget evidence in CI and validator hardware notes.
