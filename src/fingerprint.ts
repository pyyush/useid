import { normalizeAccessibleName } from "./canonicalizer.js";
import type { FramePathEntry, NormalizedElement, USEIDSignature } from "./types.js";

export function buildIdentityFingerprintInput(
  origin: string,
  pagePath: string,
  framePath: FramePathEntry[] | undefined,
  element: Pick<
    NormalizedElement,
    | "role"
    | "accessibleName"
    | "accessibleDescription"
    | "ancestorRoles"
    | "ancestorTags"
    | "siblingTokens"
    | "formAssociation"
    | "domDepth"
    | "region"
  >
): string {
  return [
    origin,
    pagePath,
    framePath?.map((entry) => `${entry.url}[${entry.index}]`).join(">") ?? "",
    element.role,
    normalizeAccessibleName(element.accessibleName),
    normalizeAccessibleName(element.accessibleDescription ?? ""),
    element.ancestorRoles.join(">"),
    element.ancestorTags.join(">"),
    element.siblingTokens.join(">"),
    normalizeAccessibleName(element.formAssociation ?? ""),
    String(element.domDepth),
    element.region,
  ].join("|");
}

export function buildFingerprintInputFromSignature(
  signature: USEIDSignature,
  overrides: {
    accessibleName?: string;
    accessibleDescription?: string | undefined;
    siblingTokens?: string[];
    formAssociation?: string | undefined;
  } = {}
): string {
  const hasAccessibleDescriptionOverride = Object.prototype.hasOwnProperty.call(
    overrides,
    "accessibleDescription"
  );
  const hasFormAssociationOverride = Object.prototype.hasOwnProperty.call(
    overrides,
    "formAssociation"
  );

  return buildIdentityFingerprintInput(signature.origin, signature.pagePath, signature.framePath, {
    role: signature.semantic.role,
    accessibleName: overrides.accessibleName ?? signature.semantic.accessibleName,
    accessibleDescription: hasAccessibleDescriptionOverride
      ? overrides.accessibleDescription
      : signature.semantic.accessibleDescription,
    ancestorRoles: signature.structure.ancestorRoles,
    ancestorTags: signature.structure.ancestorTags,
    siblingTokens: overrides.siblingTokens ?? signature.structure.siblingTokens,
    formAssociation: hasFormAssociationOverride
      ? overrides.formAssociation
      : signature.structure.formAssociation,
    domDepth: signature.structure.domDepth,
    region: signature.spatial.region,
  });
}
