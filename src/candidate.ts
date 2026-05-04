/**
 * Candidate generation — finds potential matches from normalized elements.
 */

import type { NormalizedElement, USEIDSignature } from "./types.js";
import { normalizeRole } from "./canonicalizer.js";

/**
 * Generate candidate elements that could match a uSEID signature.
 * Strategy: only consider same-role elements. uSEID abstains when the expected
 * role is absent instead of widening to unrelated elements.
 */
export function generateCandidates(
  signature: USEIDSignature,
  elements: NormalizedElement[]
): NormalizedElement[] {
  const targetRole = normalizeRole(signature.semantic.role);

  return elements.filter((e) => e.role === targetRole);
}
