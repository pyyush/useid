import { existsSync, readFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { performance } from "node:perf_hooks";
import { describe, expect, it } from "vitest";
import { extractElements } from "../extractor.js";
import { scoreCandidates } from "../matcher.js";
import type { AccessibilitySnapshotResult, DOMSnapshotResult } from "../snapshot-types.js";
import type { NormalizedElement, USEIDSignature } from "../types.js";

const EXTRACTION_ELEMENT_BUDGET = 600;
const EXTRACTION_TIME_BUDGET_MS = 2_000;

const SCORING_CANDIDATE_BUDGET = 2_500;
const SCORING_TIME_BUDGET_MS = 1_500;

const BUNDLE_SIZE_BUDGETS = [
  { path: "dist/index.js", rawBytes: 75_000 },
  { path: "dist/index.cjs", rawBytes: 85_000 },
] as const;
const COMBINED_GZIP_BUDGET_BYTES = 45_000;

function makeAXSnapshot(tree: unknown): AccessibilitySnapshotResult {
  return { tree, hash: "perf-ax", serialized: "{}" };
}

function makeDOMSnapshot(snapshot: unknown): DOMSnapshotResult {
  return { snapshot, hash: "perf-dom", serialized: "{}" };
}

function makeLargeButtonSnapshots(count: number): {
  domSnapshot: DOMSnapshotResult;
  accessibilitySnapshot: AccessibilitySnapshotResult;
} {
  const strings = ["html", "body", "button", ""];
  const parentIndex = [-1, 0];
  const nodeType = [1, 1];
  const nodeName = [0, 1];
  const nodeValue = [3, 3];
  const backendNodeId = [1, 2];
  const layoutNodeIndex = [0, 1];
  const layoutBounds = [
    [0, 0, 1024, 768],
    [0, 0, 1024, 768],
  ];

  const axButtons = [];

  for (let i = 0; i < count; i++) {
    const name = `Action ${i.toString().padStart(4, "0")}`;
    const nameIndex = strings.push(name) - 1;
    const buttonIndex = nodeType.length;
    const textIndex = buttonIndex + 1;

    parentIndex.push(1, buttonIndex);
    nodeType.push(1, 3);
    nodeName.push(2, 3);
    nodeValue.push(3, nameIndex);
    backendNodeId.push(10_000 + buttonIndex, 10_000 + textIndex);
    layoutNodeIndex.push(buttonIndex);
    layoutBounds.push([20 + (i % 8) * 120, 40 + Math.floor(i / 8) * 48, 100, 36]);
    axButtons.push({ role: "button", name });
  }

  return {
    accessibilitySnapshot: makeAXSnapshot({
      role: "WebArea",
      name: "Performance Fixture",
      children: axButtons,
    }),
    domSnapshot: makeDOMSnapshot({
      documents: [
        {
          nodes: { parentIndex, nodeType, nodeName, nodeValue, backendNodeId },
          layout: { nodeIndex: layoutNodeIndex, bounds: layoutBounds },
        },
      ],
      strings,
    }),
  };
}

function makeSignature(): USEIDSignature {
  return {
    version: 1,
    origin: "https://example.com",
    pagePath: "/page",
    semantic: {
      role: "button",
      accessibleName: "Target Action",
    },
    structure: {
      ancestorRoles: ["webarea"],
      ancestorTags: ["html", "body"],
      siblingTokens: ["nearby action"],
      domDepth: 1,
    },
    spatial: {
      bbox: { x: 120, y: 160, w: 100, h: 36 },
      viewportRelative: { top: 0.21, left: 0.12 },
      region: "unknown",
    },
    stability: { confidence: 0.9 },
    hash: "perf-signature",
  };
}

function makeScoringCandidates(count: number): NormalizedElement[] {
  const targetIndex = Math.floor(count / 2);

  return Array.from({ length: count }, (_, index) => ({
    index,
    role: "button",
    accessibleName: index === targetIndex ? "Target Action" : `Other Action ${index}`,
    tagName: "button",
    ancestorRoles: ["webarea"],
    ancestorTags: ["html", "body"],
    siblingTokens: index === targetIndex ? ["nearby action"] : [`other ${index}`],
    domDepth: 1,
    bbox:
      index === targetIndex
        ? { x: 120, y: 160, w: 100, h: 36 }
        : { x: 20 + (index % 20) * 40, y: 40 + Math.floor(index / 20) * 20, w: 100, h: 36 },
    region: "unknown",
    selectorHint:
      index === targetIndex
        ? 'role=button[name="target action"]'
        : `role=button[name="other action ${index}"]`,
  }));
}

describe("performance budgets", () => {
  it("extracts a large DOM and accessibility snapshot within the hot-path budget", () => {
    const { domSnapshot, accessibilitySnapshot } = makeLargeButtonSnapshots(
      EXTRACTION_ELEMENT_BUDGET
    );

    const started = performance.now();
    const elements = extractElements(domSnapshot, accessibilitySnapshot);
    const elapsed = performance.now() - started;

    expect(elements).toHaveLength(EXTRACTION_ELEMENT_BUDGET);
    expect(elapsed, `${EXTRACTION_ELEMENT_BUDGET} element extraction took ${elapsed}ms`).toBeLessThan(
      EXTRACTION_TIME_BUDGET_MS
    );
  });

  it("scores many same-role candidates within the hot-path budget", () => {
    const signature = makeSignature();
    const candidates = makeScoringCandidates(SCORING_CANDIDATE_BUDGET);

    const started = performance.now();
    const results = scoreCandidates(signature, candidates);
    const elapsed = performance.now() - started;

    expect(results).toHaveLength(SCORING_CANDIDATE_BUDGET);
    expect(results[0]!.selectorHint).toBe('role=button[name="target action"]');
    expect(elapsed, `${SCORING_CANDIDATE_BUDGET} candidate scoring took ${elapsed}ms`).toBeLessThan(
      SCORING_TIME_BUDGET_MS
    );
  });

  it("keeps built distribution artifacts within bundle-size budgets", () => {
    const missingArtifacts = BUNDLE_SIZE_BUDGETS.map((entry) => entry.path).filter(
      (path) => !existsSync(path)
    );
    expect(
      missingArtifacts,
      "run npm run build before npm test so dist bundle budgets can be checked"
    ).toEqual([]);

    let combinedGzipBytes = 0;
    for (const budget of BUNDLE_SIZE_BUDGETS) {
      const rawBytes = statSync(budget.path).size;
      const source = readFileSync(budget.path);
      combinedGzipBytes += gzipSync(source).byteLength;
      expect(rawBytes, `${budget.path} raw bundle size`).toBeLessThanOrEqual(budget.rawBytes);
    }

    expect(combinedGzipBytes, "combined gzip bundle size").toBeLessThanOrEqual(
      COMBINED_GZIP_BUDGET_BYTES
    );
  });
});
