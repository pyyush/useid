/**
 * uSEID Resolver — top-level orchestrator for resolving signatures.
 */

import { createHash } from "node:crypto";
import type { DOMSnapshotResult, AccessibilitySnapshotResult } from "./snapshot-types.js";
import type { USEIDSignature, USEIDConfig, ResolveResult, FramePathEntry } from "./types.js";
import { USEIDConfigSchema } from "./types.js";
import { extractElements } from "./extractor.js";
import { generateCandidates } from "./candidate.js";
import { scoreCandidates } from "./matcher.js";
import { applySafetyGate } from "./safety.js";
import { normalizeAccessibleName } from "./canonicalizer.js";
import { buildFingerprintInputFromSignature } from "./fingerprint.js";

export interface ResolveUSEIDOptions {
  signature: USEIDSignature;
  domSnapshot: DOMSnapshotResult;
  accessibilitySnapshot: AccessibilitySnapshotResult;
  pageUrl: string;
  framePath?: FramePathEntry[];
  config?: Partial<USEIDConfig>;
}

/**
 * Resolve a uSEID signature against current page snapshots.
 * Returns a selector hint + confidence, or abstains with explanation.
 */
export function resolveUSEID(opts: ResolveUSEIDOptions): ResolveResult {
  const config = USEIDConfigSchema.parse(opts.config ?? {});

  // Extract normalized elements from current snapshots
  const elements = extractElements(opts.domSnapshot, opts.accessibilitySnapshot, {
    maxAncestorLevels: config.maxAncestorLevels,
    maxSiblingTokens: config.maxSiblingTokens,
  });

  // Generate candidates
  const candidates = generateCandidates(opts.signature, elements);

  // Score candidates
  const scored = scoreCandidates(opts.signature, candidates, {
    weights: config.weights,
  });

  // Apply safety gate
  return applySafetyGate(scored, opts.signature, opts.pageUrl, opts.framePath, {
    threshold: config.threshold,
    marginConstraint: config.marginConstraint,
  });
}

/**
 * Compare two uSEID signatures conservatively.
 * Returns 1 for the same captured identity fingerprint, 0.5 for the same bound role
 * with drift or weaker disambiguation, and 0 for different bindings or roles.
 */
export function compareUSEID(a: USEIDSignature, b: USEIDSignature): number {
  // Compare binding
  if (a.origin !== b.origin) return 0;
  if (a.pagePath !== b.pagePath) return 0;
  if (!sameFramePath(a.framePath, b.framePath)) return 0;

  // Compare semantic core
  if (a.semantic.role !== b.semantic.role) return 0;

  // Fast path: identical fingerprints after binding/role agreement
  if (a.hash === b.hash) return 1;

  const sameName =
    normalizeAccessibleName(a.semantic.accessibleName) ===
    normalizeAccessibleName(b.semantic.accessibleName);
  const sameDescription =
    normalizeAccessibleName(a.semantic.accessibleDescription ?? "") ===
    normalizeAccessibleName(b.semantic.accessibleDescription ?? "");
  const sameStructure =
    arraysEqual(a.structure.ancestorRoles, b.structure.ancestorRoles) &&
    arraysEqual(a.structure.ancestorTags, b.structure.ancestorTags) &&
    arraysEqual(a.structure.siblingTokens, b.structure.siblingTokens) &&
    normalizeAccessibleName(a.structure.formAssociation ?? "") ===
      normalizeAccessibleName(b.structure.formAssociation ?? "") &&
    a.structure.domDepth === b.structure.domDepth &&
    a.spatial.region === b.spatial.region;

  if (sameName && sameDescription && sameStructure) {
    return 1;
  }

  return 0.5;
}

/**
 * Generate a human-readable explanation of a resolution result.
 */
export function explainResolution(result: ResolveResult): string {
  if (result.resolved === true) {
    const breakdown = `semantic ${result.scores.semantic.toFixed(3)}, structural ${result.scores.structural.toFixed(3)}, spatial ${result.scores.spatial.toFixed(3)}`;
    const gap = result.scoreGap !== undefined ? `, gap ${result.scoreGap.toFixed(3)}` : "";
    return `Resolved with confidence ${result.confidence.toFixed(3)} (${breakdown}${gap}): ${result.selectorHint}`;
  }
  const candidateList = result.candidates
    .slice(0, 3)
    .map(
      (c) =>
        `  - ${c.role}[name="${c.accessibleName}"] (${c.confidence.toFixed(3)}): ${c.explanation}`
    )
    .join("\n");
  return `Abstained (${result.abstentionReason}): ${result.explanation}\nTop candidates:\n${candidateList}`;
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

function sameFramePath(a?: FramePathEntry[], b?: FramePathEntry[]): boolean {
  if (!a?.length && !b?.length) return true;
  if (!a || !b || a.length !== b.length) return false;
  return a.every((entry, index) => entry.url === b[index]!.url && entry.index === b[index]!.index);
}

/**
 * Redact PII from a uSEID signature for logging/auditing.
 * Redacted signatures are NOT resolvable — too much signal is removed.
 * Use for log-safe storage only.
 */
export function redactUSEID(signature: USEIDSignature): USEIDSignature {
  const hashName = createHash("sha256")
    .update(signature.semantic.accessibleName)
    .digest("hex")
    .slice(0, 16);
  const redactedAccessibleName = `[redacted:${hashName}]`;
  const redactedAccessibleDescription = signature.semantic.accessibleDescription
    ? "[redacted]"
    : undefined;

  return {
    ...signature,
    semantic: {
      role: signature.semantic.role,
      accessibleName: redactedAccessibleName,
      accessibleDescription: redactedAccessibleDescription,
    },
    structure: {
      ...signature.structure,
      siblingTokens: [],
      formAssociation: undefined,
    },
    // Recompute hash with redacted content
    hash: createHash("sha256")
      .update(
        buildFingerprintInputFromSignature(signature, {
          accessibleName: redactedAccessibleName,
          accessibleDescription: redactedAccessibleDescription,
          siblingTokens: [],
          formAssociation: undefined,
        })
      )
      .digest("hex"),
  };
}
