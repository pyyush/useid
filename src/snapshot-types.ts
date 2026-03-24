/**
 * Snapshot input types for uSEID.
 *
 * These are intentionally minimal — any browser automation framework can produce
 * compatible snapshots. Only `snapshot` and `tree` are used by uSEID; other
 * fields are accepted for compatibility but ignored.
 */

/** DOM snapshot input (e.g., from CDP DOMSnapshot.captureSnapshot). */
export interface DOMSnapshotResult {
  /** Raw DOM snapshot response */
  snapshot: unknown;
  /** Optional hash for determinism comparison */
  hash?: string;
  /** Optional canonical JSON string */
  serialized?: string;
}

/** Accessibility tree snapshot input (e.g., from Playwright page.accessibility.snapshot()). */
export interface AccessibilitySnapshotResult {
  /** Accessibility tree */
  tree: unknown;
  /** Optional hash for determinism comparison */
  hash?: string;
  /** Optional canonical JSON string */
  serialized?: string;
}
