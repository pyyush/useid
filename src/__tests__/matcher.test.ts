import { describe, it, expect } from "vitest";
import { scoreCandidates } from "../matcher.js";
import type { NormalizedElement, USEIDSignature } from "../types.js";

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeSignature(overrides: Partial<USEIDSignature> = {}): USEIDSignature {
  return {
    version: 1,
    origin: "https://example.com",
    pagePath: "/page",
    semantic: {
      role: "button",
      accessibleName: "Submit",
    },
    structure: {
      ancestorRoles: ["main", "form"],
      ancestorTags: ["main", "form"],
      siblingTokens: ["cancel"],
      domDepth: 3,
    },
    spatial: {
      bbox: { x: 100, y: 200, w: 80, h: 40 },
      viewportRelative: { top: 0.26, left: 0.1 },
      region: "main",
    },
    stability: { confidence: 0.9 },
    hash: "abc123",
    ...overrides,
  };
}

function makeCandidate(overrides: Partial<NormalizedElement> = {}): NormalizedElement {
  return {
    index: 0,
    role: "button",
    accessibleName: "Submit",
    tagName: "button",
    ancestorRoles: ["main", "form"],
    ancestorTags: ["main", "form"],
    siblingTokens: ["cancel"],
    domDepth: 3,
    bbox: { x: 100, y: 200, w: 80, h: 40 },
    region: "main",
    selectorHint: 'role=button[name="submit"]',
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("scoreCandidates", () => {
  it("should return empty array when candidates list is empty", () => {
    const sig = makeSignature();
    const result = scoreCandidates(sig, []);
    expect(result).toEqual([]);
  });

  it("should return semantic score of zero when role changes", () => {
    const sig = makeSignature({ semantic: { role: "button", accessibleName: "Submit" } });
    const candidate = makeCandidate({ role: "link", accessibleName: "Submit" });

    const results = scoreCandidates(sig, [candidate]);
    expect(results[0]!.scores.semantic).toBe(0);
  });

  it("should return semantic score of 1.0 for exact name match with same role", () => {
    const sig = makeSignature();
    const candidate = makeCandidate({ accessibleName: "Submit" });

    const results = scoreCandidates(sig, [candidate]);
    expect(results[0]!.scores.semantic).toBe(1.0);
  });

  it("should return semantic score of zero when accessible names are missing", () => {
    const sig = makeSignature({ semantic: { role: "button", accessibleName: "" } });
    const candidate = makeCandidate({ accessibleName: "" });

    const results = scoreCandidates(sig, [candidate]);
    expect(results[0]!.scores.semantic).toBe(0);
    expect(results[0]!.confidence).toBeLessThan(0.5);
  });

  it("should return semantic score of 0.8 for normalized name match", () => {
    const sig = makeSignature({ semantic: { role: "button", accessibleName: "Submit Form" } });
    const candidate = makeCandidate({ accessibleName: "submit  form" });

    const results = scoreCandidates(sig, [candidate]);
    expect(results[0]!.scores.semantic).toBe(0.8);
  });

  it("should apply name change penalty for fuzzy name match", () => {
    // "Submit" vs "Submit Form" — tokens: [submit] vs [submit, form]
    // jaccard = 1/2 = 0.5, so nameSimilarity returns 0.5
    // 0.5 < 0.8 and > 0 → penalty applied: 0.5 * 0.3 = 0.15
    const sig = makeSignature({ semantic: { role: "button", accessibleName: "Submit" } });
    const candidate = makeCandidate({ accessibleName: "Submit Form" });

    const results = scoreCandidates(sig, [candidate]);
    expect(results[0]!.scores.semantic).toBeCloseTo(0.15, 2);
  });

  it("should compute structural score using ancestor Jaccard and sibling overlap", () => {
    const sig = makeSignature({
      structure: {
        ancestorRoles: ["main", "form"],
        ancestorTags: ["main", "form"],
        siblingTokens: ["cancel", "reset"],
        domDepth: 3,
      },
    });
    // Identical ancestors and siblings → high structural score
    const candidate = makeCandidate({
      ancestorRoles: ["main", "form"],
      siblingTokens: ["cancel", "reset"],
      domDepth: 3,
    });

    const results = scoreCandidates(sig, [candidate]);
    // ancestorSim=1.0, siblingSim=1.0, formAssociationSim=1.0, depthSim=1.0
    // structural = 1.0*0.5 + 1.0*0.2 + 1.0*0.2 + 1.0*0.1 = 1.0
    expect(results[0]!.scores.structural).toBeCloseTo(1.0, 2);
  });

  it("should compute lower structural score when ancestors differ", () => {
    const sig = makeSignature({
      structure: {
        ancestorRoles: ["main", "form"],
        ancestorTags: ["main", "form"],
        siblingTokens: [],
        domDepth: 3,
      },
    });
    const candidate = makeCandidate({
      ancestorRoles: ["nav", "list"],
      ancestorTags: ["nav", "ul"],
      siblingTokens: [],
      domDepth: 3,
    });

    const results = scoreCandidates(sig, [candidate]);
    // ancestorSim=0 (disjoint), siblingSim=1 (both empty), formAssociationSim=1, depthSim=1
    // structural = 0*0.5 + 1*0.2 + 1*0.2 + 1*0.1 = 0.5
    expect(results[0]!.scores.structural).toBeCloseTo(0.5, 2);
  });

  it("should reward matching form association in structural score", () => {
    const sig = makeSignature({
      structure: {
        ancestorRoles: ["main", "form"],
        ancestorTags: ["main", "form"],
        siblingTokens: [],
        formAssociation: "Email Address",
        domDepth: 3,
      },
    });

    const withMatchingLabel = makeCandidate({
      index: 0,
      formAssociation: "Email Address",
      siblingTokens: [],
    });
    const withDifferentLabel = makeCandidate({
      index: 1,
      formAssociation: "Phone Number",
      siblingTokens: [],
      selectorHint: 'role=button[name="submit phone"]',
    });

    const [best, weaker] = scoreCandidates(sig, [withDifferentLabel, withMatchingLabel]);
    expect(best.candidateIndex).toBe(0);
    expect(best.scores.structural).toBeGreaterThan(weaker.scores.structural);
  });

  it("should compute spatial score using bbox center distance", () => {
    const sig = makeSignature({
      spatial: {
        bbox: { x: 100, y: 200, w: 80, h: 40 },
        viewportRelative: { top: 0.26, left: 0.1 },
        region: "main",
      },
    });
    // Same position → spatial ≈ 1.0
    const samePos = makeCandidate({ bbox: { x: 100, y: 200, w: 80, h: 40 } });
    const results = scoreCandidates(sig, [samePos]);
    expect(results[0]!.scores.spatial).toBeCloseTo(1.0, 1);
  });

  it("documents fixed 1024x768 viewport normalization for spatial scoring", () => {
    const sig = makeSignature({
      spatial: {
        bbox: { x: 0, y: 0, w: 10, h: 10 },
        viewportRelative: { top: 0, left: 0 },
        region: "main",
      },
    });
    const candidate = makeCandidate({ bbox: { x: 512, y: 384, w: 10, h: 10 } });

    const results = scoreCandidates(sig, [candidate]);
    expect(results[0]!.scores.spatial).toBeCloseTo(0.5, 5);
  });

  it("should return spatial score of zero when bbox has no area", () => {
    const sig = makeSignature({
      spatial: {
        bbox: { x: 0, y: 0, w: 0, h: 0 },
        viewportRelative: { top: 0, left: 0 },
        region: "unknown",
      },
    });
    const candidate = makeCandidate({ bbox: { x: 100, y: 200, w: 80, h: 40 } });

    const results = scoreCandidates(sig, [candidate]);
    expect(results[0]!.scores.spatial).toBe(0);
  });

  it("should sort candidates by confidence descending", () => {
    const sig = makeSignature();
    const high = makeCandidate({ index: 0, accessibleName: "Submit" });
    const low = makeCandidate({
      index: 1,
      role: "link",
      accessibleName: "Other",
      selectorHint: 'role=link[name="other"]',
    });

    const results = scoreCandidates(sig, [low, high]);
    expect(results[0]!.candidateIndex).toBe(0);
    expect(results[0]!.confidence).toBeGreaterThan(results[1]!.confidence);
  });

  it("should apply custom weight configuration", () => {
    const sig = makeSignature();
    // Candidate with matching role/name but different spatial position
    const candidate = makeCandidate({ bbox: { x: 500, y: 500, w: 80, h: 40 } });

    const semanticOnly = scoreCandidates(sig, [candidate], {
      weights: { semantic: 1.0, structural: 0, spatial: 0 },
    });
    const spatialOnly = scoreCandidates(sig, [candidate], {
      weights: { semantic: 0, structural: 0, spatial: 1.0 },
    });

    // Semantic score is 1.0 (exact match), spatial is lower (different position)
    expect(semanticOnly[0]!.confidence).toBeCloseTo(1.0, 2);
    expect(spatialOnly[0]!.confidence).toBeLessThan(1.0);
    // Spatial-only confidence should equal just the spatial score
    expect(spatialOnly[0]!.confidence).toBeCloseTo(spatialOnly[0]!.scores.spatial, 5);
  });

  it("should reject custom weights that do not sum to 1", () => {
    const sig = makeSignature();
    const candidate = makeCandidate();

    expect(() =>
      scoreCandidates(sig, [candidate], {
        weights: { semantic: 1, structural: 1, spatial: 1 },
      })
    ).toThrow(/sum to 1/i);
  });

  it("should include role and accessibleName in results", () => {
    const sig = makeSignature();
    const candidate = makeCandidate({ role: "button", accessibleName: "Submit" });

    const results = scoreCandidates(sig, [candidate]);
    expect(results[0]!.role).toBe("button");
    expect(results[0]!.accessibleName).toBe("Submit");
  });

  it("should include a human-readable explanation for each candidate", () => {
    const sig = makeSignature();
    const results = scoreCandidates(sig, [makeCandidate()]);
    expect(results[0]!.explanation).toContain("semantic");
    expect(results[0]!.explanation).toContain("structural");
    expect(results[0]!.explanation).toContain("spatial");
  });
});
