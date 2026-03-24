# uSEID

**Your selectors break. uSEID doesn't.**

Browser agents and E2E tests fail when the UI changes. A developer renames a CSS class, wraps a button in a new `<div>`, or ships an A/B variant — and suddenly your carefully crafted selectors target the wrong element. Or nothing at all.

uSEID solves this by identifying elements the way a human would: by what they *are* (a "Submit" button), where they *sit* (inside the checkout form), and where they *appear* (bottom-right of the main content). When the DOM reshuffles but the element is still there, uSEID finds it. When it's genuinely gone or ambiguous, uSEID tells you — it never silently acts on the wrong thing.

## How It Works

```
                     Build                              Resolve
                     ─────                              ───────
Snapshots ──→ Canonicalize ──→ Extract ──→ Signature    Signature + New Snapshots
 (DOM + A11y)   (normalize)    (features)   (portable)      ↓
                                                        Candidates → Score → Safety Gate
                                                                              ↓
                                                                    Match (with confidence)
                                                                    or Abstain (with reason)
```

uSEID builds a **portable signature** from three signals:

| Signal | What it captures | Why it's stable |
|--------|-----------------|-----------------|
| **Semantic** | ARIA role + accessible name | Standardized by W3C, rarely changes |
| **Structural** | Ancestor roles, sibling labels, form associations | Survives wrapper changes |
| **Spatial** | Bounding box position | Catches layout-only changes |

## Install

```bash
npm install @pyyush/useid
```

Zero config. One dependency (zod). Works with any Node.js 20+ project.

## Quick Start

```typescript
import { buildUSEID, resolveUSEID } from "@pyyush/useid";

// Capture snapshots from your browser automation tool
const domSnapshot = {
  snapshot: await cdpSession.send("DOMSnapshot.captureSnapshot", {
    computedStyles: ["display", "visibility", "opacity", "position"],
    includeDOMRects: true,
  }),
};
const a11ySnapshot = {
  tree: await page.accessibility.snapshot({ interestingOnly: false }),
};

// Build a signature for the "Add to Cart" button
const signature = buildUSEID({
  domSnapshot,
  accessibilitySnapshot: a11ySnapshot,
  elementIndex: 0,  // Index in the extracted element list
  pageUrl: "https://shop.example.com/product/42",
});

// Store the signature. Ship it. Come back next week.

// Resolve it against fresh snapshots — even after a redesign
const result = resolveUSEID({
  signature,
  domSnapshot: freshDomSnapshot,
  accessibilitySnapshot: freshA11ySnapshot,
  pageUrl: "https://shop.example.com/product/42",
});

if (result.resolved) {
  console.log(result.selectorHint);  // role=button[name="add to cart"]
  console.log(result.confidence);    // 0.94
} else {
  console.log(result.abstentionReason);  // "below_threshold"
  console.log(result.explanation);       // human-readable why
}
```

## Safety: Wrong Element Is Worse Than No Element

Most selector strategies fail silently — they click *something*, just not the right thing. uSEID's safety gate ensures that doesn't happen:

| When this happens... | uSEID does this | Why |
|---------------------|----------------|-----|
| Page URL doesn't match signature | Abstains (`binding_mismatch`) | Prevents cross-page false matches |
| No elements match the expected role | Abstains (`no_candidates`) | Element was removed |
| Best match scores below 0.85 | Abstains (`below_threshold`) | Not confident enough |
| Two candidates score too close | Abstains (`ambiguous_match`) | Can't tell which is right |

Every abstention comes with an `explanation` string and a ranked `candidates` list so you can debug or escalate to a human.

## Configurable Scoring

The defaults work well for most cases. When they don't, everything is tunable:

```typescript
resolveUSEID({
  signature,
  domSnapshot,
  accessibilitySnapshot: a11ySnapshot,
  pageUrl: "https://example.com/page",
  config: {
    threshold: 0.9,          // Stricter (default: 0.85)
    marginConstraint: 0.15,  // Wider gap required (default: 0.1)
    weights: {
      semantic: 0.7,         // Trust names more (default: 0.5)
      structural: 0.2,       // Trust DOM context less (default: 0.3)
      spatial: 0.1,          // Trust position less (default: 0.2)
    },
  },
});
```

## Privacy Built In

Element signatures can contain accessible names from form labels. For logging or storage:

```typescript
import { redactUSEID } from "@pyyush/useid";

const safe = redactUSEID(signature);
// accessible names → hashed, sibling tokens → stripped, form labels → removed
// Safe to log. NOT resolvable after redaction (by design).
```

## Bring Your Own Automation

uSEID is framework-agnostic. It accepts two minimal interfaces:

```typescript
interface DOMSnapshotResult {
  snapshot: unknown;  // CDP DOMSnapshot.captureSnapshot response
}

interface AccessibilitySnapshotResult {
  tree: unknown;  // Playwright, Puppeteer, or any a11y tree
}
```

No Playwright dependency. No CDP dependency. If your tool can produce a DOM tree and an accessibility tree, uSEID works with it.

## What Works Today (v0.1.0)

| | Supported | Behavior |
|-|-----------|----------|
| Chromium | Yes | Full CDP snapshot support |
| Main frame | Yes | Default |
| Same-origin iframes | Yes | Via `framePath` binding |
| Cross-origin iframes | No | Abstains with explanation |
| Open shadow DOM | Yes | Flattened by CDP DOMSnapshot |
| Closed shadow DOM | No | Abstains |

## Full API

| Function | Purpose |
|----------|---------|
| `buildUSEID(opts)` | Build a portable signature from snapshots |
| `resolveUSEID(opts)` | Resolve a signature against current snapshots |
| `compareUSEID(a, b)` | Compare two signatures (0, 0.5, or 1) |
| `explainResolution(result)` | Human-readable explanation |
| `redactUSEID(signature)` | Strip PII for safe logging |

Lower-level functions are also exported for custom pipelines: `extractElements`, `generateCandidates`, `scoreCandidates`, `applySafetyGate`, `checkBinding`.

## License

Apache-2.0
