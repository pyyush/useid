// uSEID — Universal Semantic Element ID
// Portable grounding and safe resolution via ARIA semantics + DOM structure + visual anchoring

// Snapshot input types
export type { DOMSnapshotResult, AccessibilitySnapshotResult } from "./snapshot-types.js";

// Types and schemas
export {
  type FramePathEntry,
  type SemanticRegion,
  type USEIDSemantic,
  type USEIDStructure,
  type USEIDSpatial,
  type USEIDStability,
  type USEIDSignature,
  type MatchWeights,
  type USEIDConfig,
  type CandidateScores,
  type USEIDAbstentionReason,
  type CandidateResult,
  type ResolveResult,
  type NormalizedElement,
  type BoundingBox,
  FramePathEntrySchema,
  SemanticRegionSchema,
  USEIDSemanticSchema,
  USEIDStructureSchema,
  USEIDSpatialSchema,
  USEIDStabilitySchema,
  USEIDSignatureSchema,
  MatchWeightsSchema,
  USEIDConfigSchema,
  CandidateScoresSchema,
  USEIDAbstentionReasonSchema,
  CandidateResultSchema,
  ResolveResultSchema,
  BoundingBoxSchema,
} from "./types.js";

// Constants
export {
  DEFAULT_THRESHOLD,
  DEFAULT_MARGIN_CONSTRAINT,
  DEFAULT_WEIGHTS,
  MAX_ANCESTOR_LEVELS,
  MAX_SIBLING_TOKENS,
  USEID_VERSION,
  LANDMARK_ROLE_MAP,
} from "./constants.js";

// Canonicalizer
export {
  normalizeAccessibleName,
  normalizeTag,
  normalizeRole,
  tokenize,
  jaccardSimilarity,
  nameSimilarity,
} from "./canonicalizer.js";

// Extractor
export { extractElements, type ExtractOptions } from "./extractor.js";

// Builder
export { buildUSEID, type BuildUSEIDOptions } from "./builder.js";

// Candidate generator
export { generateCandidates } from "./candidate.js";

// Matcher
export { scoreCandidates, type MatcherConfig } from "./matcher.js";

// Safety gate
export { checkBinding, applySafetyGate, type SafetyConfig } from "./safety.js";

// Resolver
export {
  resolveUSEID,
  compareUSEID,
  explainResolution,
  redactUSEID,
  type ResolveUSEIDOptions,
} from "./resolver.js";
