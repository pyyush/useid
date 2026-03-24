/**
 * Snapshot types for uSEID input.
 * These are intentionally minimal — any browser automation framework can produce
 * compatible snapshots. Originally derived from DBAR (Deterministic Browser Agent Runtime).
 */

/** Result of a CDP DOM snapshot capture. */
export interface DOMSnapshotResult {
  /** Raw CDP DOMSnapshot.captureSnapshot response */
  snapshot: unknown;
  /** SHA-256 hash of canonical JSON */
  hash: string;
  /** Canonical JSON string */
  serialized: string;
}

/** Result of an accessibility tree snapshot. */
export interface AccessibilitySnapshotResult {
  /** Accessibility tree (e.g., from Playwright page.accessibility.snapshot()) */
  tree: unknown;
  /** SHA-256 hash of canonical JSON */
  hash: string;
  /** Canonical JSON string */
  serialized: string;
}

/** Result of a page screenshot. */
export interface ScreenshotResult {
  /** PNG buffer */
  buffer: Buffer;
  /** SHA-256 hash */
  hash: string;
}
