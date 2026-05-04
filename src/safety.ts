/**
 * Safety gate — enforces binding checks, threshold, and margin constraints.
 * Abstains rather than acting on the wrong element.
 */

import type { USEIDSignature, CandidateResult, ResolveResult, FramePathEntry } from "./types.js";
import { DEFAULT_THRESHOLD, DEFAULT_MARGIN_CONSTRAINT } from "./constants.js";

export interface SafetyConfig {
  threshold?: number;
  marginConstraint?: number;
}

/**
 * Check origin + page path binding. Returns abstention reason or null if OK.
 */
export function checkBinding(
  signature: USEIDSignature,
  pageUrl: string,
  framePath?: FramePathEntry[]
): string | null {
  let url: URL;
  try {
    url = new URL(pageUrl);
  } catch {
    return `Invalid page URL: ${pageUrl}`;
  }

  // Origin check
  if (url.origin !== signature.origin) {
    return `Origin mismatch: signature bound to ${signature.origin}, current page is ${url.origin}`;
  }

  // Page path check
  if (url.pathname !== signature.pagePath) {
    return `Page path mismatch: signature bound to ${signature.pagePath}, current page is ${url.pathname}`;
  }

  // Frame binding check
  if (signature.framePath && signature.framePath.length > 0) {
    if (!framePath || framePath.length !== signature.framePath.length) {
      return `Frame path mismatch: signature expects ${signature.framePath.length} frame(s), got ${framePath?.length ?? 0}`;
    }
    for (let i = 0; i < signature.framePath.length; i++) {
      const expected = signature.framePath[i]!;
      const actual = framePath[i]!;
      if (expected.url !== actual.url || expected.index !== actual.index) {
        return `Frame path mismatch at level ${i}: expected ${expected.url}[${expected.index}], got ${actual.url}[${actual.index}]`;
      }
    }
  }

  return null;
}

/**
 * Apply safety gate to scored candidates.
 * Enforces threshold and margin constraints.
 */
export function applySafetyGate(
  candidates: CandidateResult[],
  signature: USEIDSignature,
  pageUrl: string,
  framePath?: FramePathEntry[],
  config: SafetyConfig = {}
): ResolveResult {
  const threshold = config.threshold ?? DEFAULT_THRESHOLD;
  const margin = config.marginConstraint ?? DEFAULT_MARGIN_CONSTRAINT;

  // Check binding first
  const bindingError = checkBinding(signature, pageUrl, framePath);
  if (bindingError) {
    return {
      resolved: false,
      candidates,
      explanation: bindingError,
      abstentionReason: "binding_mismatch",
    };
  }

  // No candidates
  if (candidates.length === 0) {
    return {
      resolved: false,
      candidates: [],
      explanation: `No candidate elements found for role="${signature.semantic.role}" name="${signature.semantic.accessibleName}"`,
      abstentionReason: "no_candidates",
    };
  }

  const top = candidates[0]!;
  const second = candidates[1];
  const scoreGap = second ? top.confidence - second.confidence : undefined;

  // Threshold check
  if (top.confidence < threshold) {
    return {
      resolved: false,
      candidates,
      explanation: `Best candidate ${top.role}[name="${top.accessibleName}"] scored ${top.confidence.toFixed(3)} (${top.explanation}), below threshold ${threshold.toFixed(3)}`,
      abstentionReason: "below_threshold",
    };
  }

  // Margin constraint: if the runner-up is too close, abstain even if it is
  // slightly below threshold. A near-tie is still ambiguous.
  if (second && scoreGap !== undefined && scoreGap < margin) {
    return {
      resolved: false,
      candidates,
      explanation: `Ambiguous between ${top.role}[name="${top.accessibleName}"] (${top.confidence.toFixed(3)}) and ${second.role}[name="${second.accessibleName}"] (${second.confidence.toFixed(3)}); gap ${scoreGap.toFixed(3)} is below margin ${margin.toFixed(3)}`,
      abstentionReason: "ambiguous_match",
    };
  }

  // Resolved successfully
  return {
    resolved: true,
    selectorHint: top.selectorHint,
    candidateIndex: top.candidateIndex,
    confidence: top.confidence,
    scores: top.scores,
    scoreGap,
    explanation: `Matched ${top.role}[name="${top.accessibleName}"] with confidence ${top.confidence.toFixed(3)} (${top.explanation}${scoreGap !== undefined ? `, gap ${scoreGap.toFixed(3)}` : ""})`,
    framePath: signature.framePath,
  };
}
