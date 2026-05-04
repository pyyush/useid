/**
 * Weighted scoring matcher for uSEID resolution.
 *
 * Scoring dimensions:
 * - Semantic (0.5): role match + accessible name similarity
 * - Structural (0.3): ancestry + sibling overlap + form association + depth
 * - Spatial (0.2): inverse normalized bbox center distance
 */

import { MatchWeightsSchema } from "./types.js";
import type { NormalizedElement, USEIDSignature, CandidateResult, MatchWeights } from "./types.js";
import {
  nameSimilarity,
  jaccardSimilarity,
  normalizeAccessibleName,
  normalizeRole,
} from "./canonicalizer.js";
import {
  DEFAULT_WEIGHTS,
  NAME_CHANGE_PENALTY,
  DEFAULT_VIEWPORT_WIDTH,
  DEFAULT_VIEWPORT_HEIGHT,
} from "./constants.js";

export interface MatcherConfig {
  weights?: MatchWeights;
}

/**
 * Score all candidate elements against a uSEID signature.
 * Returns candidates sorted by confidence (highest first).
 */
export function scoreCandidates(
  signature: USEIDSignature,
  candidates: NormalizedElement[],
  config: MatcherConfig = {}
): CandidateResult[] {
  const weights = MatchWeightsSchema.parse(config.weights ?? DEFAULT_WEIGHTS);

  const results: CandidateResult[] = candidates.map((candidate) => {
    const semantic = computeSemanticScore(signature, candidate);
    const structural = computeStructuralScore(signature, candidate);
    const spatial = computeSpatialScore(signature, candidate);

    const confidence =
      semantic * weights.semantic + structural * weights.structural + spatial * weights.spatial;

    return {
      candidateIndex: candidate.index,
      selectorHint: candidate.selectorHint,
      confidence,
      scores: { semantic, structural, spatial },
      explanation: summarizeCandidateMatch(semantic, structural, spatial),
      role: candidate.role,
      accessibleName: candidate.accessibleName,
    };
  });

  // Sort by confidence descending
  results.sort((a, b) => b.confidence - a.confidence);
  return results;
}

function summarizeCandidateMatch(semantic: number, structural: number, spatial: number): string {
  const semanticSummary =
    semantic >= 0.95
      ? "semantic exact"
      : semantic >= 0.5
        ? "semantic partial"
        : "semantic weak";
  const structuralSummary =
    structural >= 0.8
      ? "structural strong"
      : structural >= 0.5
        ? "structural moderate"
        : "structural weak";
  const spatialSummary =
    spatial >= 0.8 ? "spatial nearby" : spatial >= 0.4 ? "spatial plausible" : "spatial weak";

  return [
    `${semanticSummary} (${semantic.toFixed(3)})`,
    `${structuralSummary} (${structural.toFixed(3)})`,
    `${spatialSummary} (${spatial.toFixed(3)})`,
  ].join(", ");
}

/**
 * Semantic score: role match (required) + name similarity.
 * Role mismatch = 0. Name change beyond normalization = penalty.
 */
function computeSemanticScore(sig: USEIDSignature, el: NormalizedElement): number {
  const sigRole = normalizeRole(sig.semantic.role);
  const elRole = normalizeRole(el.role);

  // Invariant: role must match
  if (sigRole !== elRole) return 0;

  const sigName = normalizeAccessibleName(sig.semantic.accessibleName);
  const elName = normalizeAccessibleName(el.accessibleName);
  if (!sigName || !elName) return 0;

  // Name similarity
  const similarity = nameSimilarity(sig.semantic.accessibleName, el.accessibleName);

  // Apply penalty for name changes beyond normalization
  if (similarity < 0.8 && similarity > 0) {
    return similarity * NAME_CHANGE_PENALTY;
  }

  return similarity;
}

/**
 * Structural score: ancestry + sibling overlap + form association + depth.
 *
 * Sub-weights are fixed (not configurable) because they reflect the relative
 * information density of each structural signal:
 * - Ancestor roles/tags (0.5): strongest — uniquely locate an element in the DOM tree
 * - Sibling tokens (0.2): moderate — disambiguate elements in the same container
 * - Form association (0.2): strong for labeled inputs and controls
 * - Depth proximity (0.1): weak — only a rough positional hint, often noisy
 */
function computeStructuralScore(sig: USEIDSignature, el: NormalizedElement): number {
  const ancestorRoleSim = jaccardSimilarity(sig.structure.ancestorRoles, el.ancestorRoles);
  const ancestorTagSim = jaccardSimilarity(sig.structure.ancestorTags, el.ancestorTags);
  const ancestorSim = ancestorRoleSim * 0.7 + ancestorTagSim * 0.3;
  const siblingSim = jaccardSimilarity(sig.structure.siblingTokens, el.siblingTokens);
  const formAssociationSim = computeOptionalNameSimilarity(
    sig.structure.formAssociation,
    el.formAssociation
  );
  const depthDiff = Math.abs(sig.structure.domDepth - el.domDepth);
  const depthSim = 1 / (1 + depthDiff);

  return ancestorSim * 0.5 + siblingSim * 0.2 + formAssociationSim * 0.2 + depthSim * 0.1;
}

/**
 * Spatial score: inverse normalized distance between bbox centers.
 * Returns 0 if either bbox is zero-area (no spatial data).
 */
function computeSpatialScore(sig: USEIDSignature, el: NormalizedElement): number {
  const sigBbox = sig.spatial.bbox;
  const elBbox = el.bbox;

  // Skip if either has no spatial data
  if (sigBbox.w <= 0 || sigBbox.h <= 0) return 0;
  if (elBbox.w <= 0 || elBbox.h <= 0) return 0;

  // Compute center points
  const sigCx = sigBbox.x + sigBbox.w / 2;
  const sigCy = sigBbox.y + sigBbox.h / 2;
  const elCx = elBbox.x + elBbox.w / 2;
  const elCy = elBbox.y + elBbox.h / 2;

  // Euclidean distance normalized by viewport diagonal
  const diagonal = Math.sqrt(DEFAULT_VIEWPORT_WIDTH ** 2 + DEFAULT_VIEWPORT_HEIGHT ** 2);
  const distance = Math.sqrt((sigCx - elCx) ** 2 + (sigCy - elCy) ** 2);

  return Math.max(0, 1 - distance / diagonal);
}

function computeOptionalNameSimilarity(a?: string, b?: string): number {
  const normalizedA = normalizeAccessibleName(a ?? "");
  const normalizedB = normalizeAccessibleName(b ?? "");

  if (!normalizedA && !normalizedB) return 1;
  if (!normalizedA || !normalizedB) return 0;

  return nameSimilarity(normalizedA, normalizedB);
}
