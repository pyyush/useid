import { describe, expect, it } from "vitest";
import { buildUSEID } from "../builder.js";
import { resolveUSEID } from "../resolver.js";
import {
  closedShadowFixture,
  duplicateSameNameFixture,
  missingRoleAndNameFixture,
  openShadowFixture,
  realisticPageUrl,
  sameOriginFramePath,
  sameOriginIframeFixture,
  wrapperLayoutChurnFixture,
} from "./fixtures/realistic-snapshots.js";

describe("realistic snapshot fixtures", () => {
  it("resolves the same target under wrapper and layout churn", () => {
    const signature = buildUSEID({
      domSnapshot: wrapperLayoutChurnFixture.before.domSnapshot,
      accessibilitySnapshot: wrapperLayoutChurnFixture.before.accessibilitySnapshot,
      elementIndex: 0,
      pageUrl: realisticPageUrl,
    });

    const result = resolveUSEID({
      signature,
      domSnapshot: wrapperLayoutChurnFixture.after.domSnapshot,
      accessibilitySnapshot: wrapperLayoutChurnFixture.after.accessibilitySnapshot,
      pageUrl: realisticPageUrl,
    });

    expect(result.resolved).toBe(true);
    if (result.resolved) {
      expect(result.selectorHint).toBe('role=button[name="continue"]');
      expect(result.confidence).toBeGreaterThanOrEqual(0.85);
    }
  });

  it("abstains on duplicate same-role same-name candidates without sufficient margin", () => {
    const signature = buildUSEID({
      domSnapshot: duplicateSameNameFixture.before.domSnapshot,
      accessibilitySnapshot: duplicateSameNameFixture.before.accessibilitySnapshot,
      elementIndex: 0,
      pageUrl: realisticPageUrl,
    });

    const result = resolveUSEID({
      signature,
      domSnapshot: duplicateSameNameFixture.after.domSnapshot,
      accessibilitySnapshot: duplicateSameNameFixture.after.accessibilitySnapshot,
      pageUrl: realisticPageUrl,
      config: { threshold: 0.7 },
    });

    expect(result.resolved).toBe(false);
    if (!result.resolved) {
      expect(result.abstentionReason).toBe("ambiguous_match");
      expect(result.candidates).toHaveLength(3);
    }
  });

  it("abstains when the target loses both role and accessible name", () => {
    const signature = buildUSEID({
      domSnapshot: wrapperLayoutChurnFixture.before.domSnapshot,
      accessibilitySnapshot: wrapperLayoutChurnFixture.before.accessibilitySnapshot,
      elementIndex: 0,
      pageUrl: realisticPageUrl,
    });

    const result = resolveUSEID({
      signature,
      domSnapshot: missingRoleAndNameFixture.domSnapshot,
      accessibilitySnapshot: missingRoleAndNameFixture.accessibilitySnapshot,
      pageUrl: realisticPageUrl,
    });

    expect(result.resolved).toBe(false);
    if (!result.resolved) {
      expect(result.abstentionReason).toBe("no_candidates");
    }
  });

  it("uses same-origin framePath binding for iframe targets", () => {
    const signature = buildUSEID({
      domSnapshot: sameOriginIframeFixture.domSnapshot,
      accessibilitySnapshot: sameOriginIframeFixture.accessibilitySnapshot,
      elementIndex: 0,
      pageUrl: realisticPageUrl,
      framePath: sameOriginFramePath,
    });

    const resolved = resolveUSEID({
      signature,
      domSnapshot: sameOriginIframeFixture.domSnapshot,
      accessibilitySnapshot: sameOriginIframeFixture.accessibilitySnapshot,
      pageUrl: realisticPageUrl,
      framePath: sameOriginFramePath,
    });
    const missingFramePath = resolveUSEID({
      signature,
      domSnapshot: sameOriginIframeFixture.domSnapshot,
      accessibilitySnapshot: sameOriginIframeFixture.accessibilitySnapshot,
      pageUrl: realisticPageUrl,
    });

    expect(resolved.resolved).toBe(true);
    if (resolved.resolved) {
      expect(resolved.framePath).toEqual(sameOriginFramePath);
    }
    expect(missingFramePath.resolved).toBe(false);
    if (!missingFramePath.resolved) {
      expect(missingFramePath.abstentionReason).toBe("binding_mismatch");
    }
  });

  it("supports open shadow DOM when snapshots expose the internal target", () => {
    const signature = buildUSEID({
      domSnapshot: openShadowFixture.domSnapshot,
      accessibilitySnapshot: openShadowFixture.accessibilitySnapshot,
      elementIndex: 0,
      pageUrl: realisticPageUrl,
    });

    const result = resolveUSEID({
      signature,
      domSnapshot: openShadowFixture.domSnapshot,
      accessibilitySnapshot: openShadowFixture.accessibilitySnapshot,
      pageUrl: realisticPageUrl,
    });

    expect(result.resolved).toBe(true);
    if (result.resolved) {
      expect(result.selectorHint).toBe('role=button[name="shadow action"]');
      expect(result.scores.spatial).toBeGreaterThan(0);
    }
  });

  it("abstains for closed shadow DOM targets without exposed DOM/layout evidence", () => {
    const signature = buildUSEID({
      domSnapshot: closedShadowFixture.domSnapshot,
      accessibilitySnapshot: closedShadowFixture.accessibilitySnapshot,
      elementIndex: 0,
      pageUrl: realisticPageUrl,
    });

    const result = resolveUSEID({
      signature,
      domSnapshot: closedShadowFixture.domSnapshot,
      accessibilitySnapshot: closedShadowFixture.accessibilitySnapshot,
      pageUrl: realisticPageUrl,
    });

    expect(result.resolved).toBe(false);
    if (!result.resolved) {
      expect(result.abstentionReason).toBe("below_threshold");
    }
  });
});
