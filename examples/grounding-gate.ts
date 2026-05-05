/**
 * Repo example only: copy/adapt this grounding-gate pattern in your own host
 * application rather than importing this file from the published package.
 */

import type {
  AccessibilitySnapshotResult,
  CandidateScores,
  DOMSnapshotResult,
  FramePathEntry,
  MatchWeights,
  USEIDAbstentionReason,
  ResolveResult,
  USEIDSignature,
  USEIDConfig,
} from "../src/index.js";
import { resolveUSEID } from "../src/index.js";

type BrowserHarness = {
  captureDOMSnapshot(): Promise<DOMSnapshotResult>;
  captureAccessibilitySnapshot(): Promise<AccessibilitySnapshotResult>;
  currentUrl(): Promise<string>;
  currentFramePath?(): Promise<FramePathEntry[]>;
  recordGrounding?(log: GroundingLog): Promise<void> | void;
  click(selectorHint: string): Promise<void>;
};

type SnapshotBundle = {
  domSnapshot: DOMSnapshotResult;
  accessibilitySnapshot: AccessibilitySnapshotResult;
  pageUrl: string;
  framePath?: FramePathEntry[];
};

export type GroundingLog = {
  resolved: boolean;
  abstentionReason?: USEIDAbstentionReason;
  confidence?: number;
  scoreGap?: number;
  scores?: CandidateScores;
  threshold: number;
  marginConstraint: number;
  weights?: MatchWeights;
  candidateCount?: number;
  topCandidateScoreBands?: Array<{
    confidence: number;
    scores: CandidateScores;
  }>;
  explanation: string;
};

export type GroundingGateOptions = {
  confidenceThreshold?: number;
  marginConstraint?: number;
  weights?: MatchWeights;
};

const DEFAULT_CONFIDENCE_THRESHOLD = 0.85;
const DEFAULT_MARGIN_CONSTRAINT = 0.1;

export async function clickOnlyWhenGrounded(
  harness: BrowserHarness,
  signature: USEIDSignature,
  options: GroundingGateOptions = {}
): Promise<void> {
  const current = await captureSnapshotBoundary(harness);
  const result = resolveWithGate(signature, current, options);
  const groundingLog = toGroundingLog(result, options);

  await harness.recordGrounding?.(groundingLog);

  if (result.resolved === false) {
    throw new Error(`uSEID abstained: ${result.abstentionReason} - ${groundingLog.explanation}`);
  }

  await harness.click(result.selectorHint);
}

export function resolveWithGate(
  signature: USEIDSignature,
  current: SnapshotBundle,
  options: GroundingGateOptions = {}
): ResolveResult {
  return resolveUSEID({
    signature,
    domSnapshot: current.domSnapshot,
    accessibilitySnapshot: current.accessibilitySnapshot,
    pageUrl: current.pageUrl,
    framePath: current.framePath,
    config: toResolveConfig(options),
  });
}

export async function captureSnapshotBoundary(harness: BrowserHarness): Promise<SnapshotBundle> {
  const [domSnapshot, accessibilitySnapshot, pageUrl, framePath] = await Promise.all([
    harness.captureDOMSnapshot(),
    harness.captureAccessibilitySnapshot(),
    harness.currentUrl(),
    harness.currentFramePath?.() ?? Promise.resolve(undefined),
  ]);

  return { domSnapshot, accessibilitySnapshot, pageUrl, framePath };
}

export function toGroundingLog(
  result: ResolveResult,
  options: GroundingGateOptions = {}
): GroundingLog {
  const threshold = options.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD;
  const marginConstraint = options.marginConstraint ?? DEFAULT_MARGIN_CONSTRAINT;

  if (result.resolved) {
    return {
      resolved: true,
      confidence: result.confidence,
      scoreGap: result.scoreGap,
      scores: result.scores,
      threshold,
      marginConstraint,
      weights: options.weights,
      explanation: "resolved",
    };
  }

  return {
    resolved: false,
    abstentionReason: result.abstentionReason,
    threshold,
    marginConstraint,
    weights: options.weights,
    candidateCount: result.candidates.length,
    topCandidateScoreBands: result.candidates.slice(0, 3).map((candidate) => ({
      confidence: candidate.confidence,
      scores: candidate.scores,
    })),
    explanation: redactedAbstentionExplanation(result.abstentionReason),
  };
}

function toResolveConfig(options: GroundingGateOptions): Partial<USEIDConfig> {
  return {
    threshold: options.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD,
    marginConstraint: options.marginConstraint ?? DEFAULT_MARGIN_CONSTRAINT,
    weights: options.weights,
  };
}

function redactedAbstentionExplanation(reason: USEIDAbstentionReason): string {
  switch (reason) {
    case "binding_mismatch":
      return "signature binding did not match the current page or frame";
    case "no_candidates":
      return "no same-role candidates were present in the current snapshot";
    case "below_threshold":
      return "best candidate did not meet the configured confidence threshold";
    case "ambiguous_match":
      return "top candidates were too close to act safely";
  }
}
