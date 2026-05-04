/**
 * Feature extraction from snapshots into typed NormalizedElement records.
 *
 * Strategy:
 * - Accessibility tree (Playwright) is the primary source for semantics (role, name)
 * - DOM snapshot (CDP DOMSnapshot.captureSnapshot) provides spatial data (layout bounds)
 * - Join is heuristic: walk the a11y tree, match to DOM nodes by structural position
 * - If no DOM match, spatial features default to zero bbox
 */

import type { DOMSnapshotResult, AccessibilitySnapshotResult } from "./snapshot-types.js";
import type { NormalizedElement, SemanticRegion } from "./types.js";
import {
  nameSimilarity,
  normalizeAccessibleName,
  normalizeRole,
  normalizeTag,
} from "./canonicalizer.js";
import {
  LANDMARK_ROLE_MAP,
  MAX_ANCESTOR_LEVELS,
  MAX_SIBLING_TOKENS,
} from "./constants.js";

// ── Internal types for raw CDP DOMSnapshot response ─────────────────────────

interface CDPDOMSnapshotDocument {
  nodes: {
    parentIndex: number[];
    nodeType: number[];
    nodeName: number[]; // indices into strings table
    nodeValue: number[];
    backendNodeId: number[];
    attributes?: Array<{ index: number[]; value: number[] }>;
  };
  layout?: {
    nodeIndex: number[];
    bounds: number[][]; // [x, y, width, height] per layout node
  };
}

interface CDPDOMSnapshot {
  documents: CDPDOMSnapshotDocument[];
  strings: string[];
}

// ── Internal types for Playwright accessibility snapshot ─────────────────────

interface AXNode {
  role: string;
  name: string;
  description?: string;
  value?: string;
  children?: AXNode[];
}

// ── Flattened a11y element ──────────────────────────────────────────────────

interface FlatAXElement {
  role: string;
  name: string;
  description?: string;
  depth: number;
  ancestorRoles: string[];
  siblingNames: string[];
  childIndex: number;
}

// ── Public API ──────────────────────────────────────────────────────────────

export interface ExtractOptions {
  maxAncestorLevels?: number;
  maxSiblingTokens?: number;
}

/**
 * Extract NormalizedElement[] from snapshot data.
 * Filters to interactive/actionable elements (buttons, links, inputs, etc.)
 */
export function extractElements(
  domSnapshot: DOMSnapshotResult,
  accessibilitySnapshot: AccessibilitySnapshotResult,
  options: ExtractOptions = {}
): NormalizedElement[] {
  const maxAncestors = options.maxAncestorLevels ?? MAX_ANCESTOR_LEVELS;
  const maxSiblings = options.maxSiblingTokens ?? MAX_SIBLING_TOKENS;

  // Parse a11y tree into flat elements
  const axElements = flattenAccessibilityTree(
    accessibilitySnapshot.tree as AXNode | null,
    maxAncestors,
    maxSiblings
  );

  // Parse DOM snapshot for layout and structural data
  const domStructure = extractDOMStructure(domSnapshot.snapshot as CDPDOMSnapshot | null);
  const domMatchIndex = buildDOMMatchIndex(domStructure);

  // Build normalized elements
  const elements: NormalizedElement[] = [];
  let elementIndex = 0;

  for (const ax of axElements) {
    // Always skip structural container roles (not actionable elements)
    if (isStructuralRole(ax.role)) continue;
    // Skip generic roles that have no name (not identifiable)
    if (isGenericRole(ax.role) && !ax.name) continue;

    const normalizedRole = normalizeRole(ax.role);
    const normalizedName = normalizeAccessibleName(ax.name);

    // Find matching DOM node for spatial data
    const domMatch = findDOMMatch(ax, domMatchIndex);
    const bbox = domMatch?.bounds ?? { x: 0, y: 0, w: 0, h: 0 };

    // Determine semantic region from ancestor roles
    const region = detectRegion(ax.ancestorRoles);

    // Detect form association from DOM structure
    const formAssociation = domMatch?.labelText;

    // Build ancestor tag chain from DOM (if available)
    const ancestorTags = domMatch?.ancestorTags?.slice(-maxAncestors) ?? [];

    // Build selector hint
    const selectorHint = buildSelectorHint(normalizedRole, normalizedName, elementIndex);

    elements.push({
      index: elementIndex,
      role: normalizedRole,
      accessibleName: normalizedName,
      accessibleDescription: ax.description,
      tagName: domMatch?.tagName ?? roleToTag(normalizedRole),
      ancestorRoles: ax.ancestorRoles.slice(-maxAncestors),
      ancestorTags,
      siblingTokens: ax.siblingNames.slice(0, maxSiblings),
      formAssociation,
      domDepth: ax.depth,
      bbox,
      region,
      selectorHint,
    });

    elementIndex++;
  }

  return elements;
}

// ── Accessibility tree flattening ───────────────────────────────────────────

function flattenAccessibilityTree(
  root: AXNode | null,
  maxAncestors: number,
  maxSiblings: number
): FlatAXElement[] {
  if (!root) return [];

  const result: FlatAXElement[] = [];

  function walk(
    node: AXNode,
    depth: number,
    ancestorRoles: string[],
    siblings: AXNode[],
    childIndex: number
  ) {
    const siblingNames = siblings
      .filter((s) => s !== node && s.name)
      .map((s) => normalizeAccessibleName(s.name))
      .slice(0, maxSiblings);

    result.push({
      role: node.role,
      name: node.name ?? "",
      description: node.description,
      depth,
      ancestorRoles: ancestorRoles.slice(-maxAncestors),
      siblingNames,
      childIndex,
    });

    if (node.children) {
      const nextAncestors = [...ancestorRoles, normalizeRole(node.role)];
      for (let i = 0; i < node.children.length; i++) {
        walk(node.children[i]!, depth + 1, nextAncestors, node.children, i);
      }
    }
  }

  walk(root, 0, [], [], 0);
  return result;
}

// ── DOM snapshot parsing ────────────────────────────────────────────────────

interface DOMNodeInfo {
  index: number;
  tagName: string;
  parentIndex: number;
  backendNodeId: number;
  bounds?: { x: number; y: number; w: number; h: number };
  ancestorTags: string[];
  labelText?: string;
  textContent?: string;
}

interface DOMMatchIndex {
  byTag: Map<string, DOMNodeInfo[]>;
  byTagAndName: Map<string, DOMNodeInfo[]>;
}

function extractDOMStructure(snapshot: CDPDOMSnapshot | null): DOMNodeInfo[] {
  if (!snapshot?.documents?.[0]?.nodes) return [];

  const doc = snapshot.documents[0];
  const strings = snapshot.strings ?? [];
  const nodes = doc.nodes;
  const nodeCount = nodes.parentIndex?.length ?? 0;

  const result: DOMNodeInfo[] = [];
  const layoutMap = extractLayoutMapFromDoc(doc);
  const childrenMap = buildChildrenMap(nodes.parentIndex ?? []);

  for (let i = 0; i < nodeCount; i++) {
    // Only process element nodes (nodeType 1)
    if (nodes.nodeType[i] !== 1) continue;

    const nameIndex = nodes.nodeName[i] ?? 0;
    const tagName = normalizeTag(strings[nameIndex] ?? "");
    const parentIdx = nodes.parentIndex[i] ?? -1;
    const backendNodeId = nodes.backendNodeId?.[i] ?? -1;

    // Build ancestor tag chain
    const ancestorTags: string[] = [];
    let current = parentIdx;
    let depth = 0;
    while (current >= 0 && depth < MAX_ANCESTOR_LEVELS) {
      if (nodes.nodeType[current] === 1) {
        const pNameIdx = nodes.nodeName[current] ?? 0;
        ancestorTags.unshift(normalizeTag(strings[pNameIdx] ?? ""));
      }
      current = nodes.parentIndex[current] ?? -1;
      depth++;
    }

    // Get bounds from layout
    const bounds = layoutMap.get(i);

    // Check for associated label (simplified: look for <label> parent or sibling)
    const labelText = findLabelForNode(i, nodes, strings, childrenMap);
    const textContent = extractNodeText(i, nodes, strings, childrenMap);

    result.push({
      index: i,
      tagName,
      parentIndex: parentIdx,
      backendNodeId,
      bounds,
      ancestorTags,
      labelText,
      textContent,
    });
  }

  return result;
}

function extractLayoutMapFromDoc(
  doc: CDPDOMSnapshotDocument
): Map<number, { x: number; y: number; w: number; h: number }> {
  const map = new Map<number, { x: number; y: number; w: number; h: number }>();
  if (!doc.layout?.nodeIndex || !doc.layout?.bounds) return map;

  const { nodeIndex, bounds } = doc.layout;
  for (let i = 0; i < nodeIndex.length; i++) {
    const nIdx = nodeIndex[i]!;
    const b = bounds[i];
    if (b && b.length >= 4) {
      map.set(nIdx, { x: b[0]!, y: b[1]!, w: b[2]!, h: b[3]! });
    }
  }
  return map;
}

// ── DOM-a11y matching ───────────────────────────────────────────────────────

function buildDOMMatchIndex(domNodes: DOMNodeInfo[]): DOMMatchIndex {
  const byTag = new Map<string, DOMNodeInfo[]>();
  const byTagAndName = new Map<string, DOMNodeInfo[]>();

  for (const node of domNodes) {
    pushMapValue(byTag, node.tagName, node);

    for (const name of getDOMNameKeys(node)) {
      pushMapValue(byTagAndName, makeTagNameKey(node.tagName, name), node);
    }
  }

  return { byTag, byTagAndName };
}

function findDOMMatch(
  ax: FlatAXElement,
  domIndex: DOMMatchIndex,
): DOMNodeInfo | undefined {
  const targetTag = roleToTag(normalizeRole(ax.role));
  if (!targetTag) return undefined;

  // Find DOM nodes matching the expected tag
  const candidates = domIndex.byTag.get(targetTag) ?? [];
  if (candidates.length === 0) return undefined;

  const expectedName = normalizeAccessibleName(ax.name);
  const exactNameMatches = domIndex.byTagAndName.get(makeTagNameKey(targetTag, expectedName));
  if (exactNameMatches?.length === 1) return exactNameMatches[0];
  if (exactNameMatches && exactNameMatches.length > 1) return undefined;

  if (!expectedName) return candidates.length === 1 ? candidates[0] : undefined;

  // If only one candidate has conflicting text evidence, do not borrow its geometry.
  if (candidates.length === 1) {
    const onlyCandidate = candidates[0]!;
    if (hasNameEvidence(onlyCandidate) && computeDOMNameScore(expectedName, onlyCandidate) === 0) {
      return undefined;
    }
    return onlyCandidate;
  }

  const rankedCandidates = candidates.map((candidate) => {
    const nameScore = computeDOMNameScore(expectedName, candidate);
      const depthScore = 1 / (1 + Math.abs(candidate.ancestorTags.length - ax.depth));
    const totalScore = nameScore * 2 + depthScore;

    return { candidate, nameScore, totalScore };
  });

  rankedCandidates.sort((a, b) => b.totalScore - a.totalScore);

  const best = rankedCandidates[0];
  if (!best || best.nameScore === 0) return undefined;

  const runnerUp = rankedCandidates[1];
  if (
    runnerUp &&
    runnerUp.nameScore === best.nameScore &&
    Math.abs(runnerUp.totalScore - best.totalScore) < 0.0001
  ) {
    return undefined;
  }

  return best.candidate;
}

function computeDOMNameScore(expectedName: string, candidate: DOMNodeInfo): number {
  return Math.max(
    nameSimilarity(expectedName, candidate.textContent ?? ""),
    nameSimilarity(expectedName, candidate.labelText ?? "")
  );
}

function hasNameEvidence(candidate: DOMNodeInfo): boolean {
  return Boolean(candidate.textContent || candidate.labelText);
}

function getDOMNameKeys(candidate: DOMNodeInfo): string[] {
  const names = new Set<string>();
  for (const value of [candidate.textContent, candidate.labelText]) {
    const normalized = normalizeAccessibleName(value ?? "");
    if (normalized) names.add(normalized);
  }
  return [...names];
}

function makeTagNameKey(tagName: string, name: string): string {
  return `${tagName}\0${name}`;
}

function pushMapValue<K, V>(map: Map<K, V[]>, key: K, value: V): void {
  const existing = map.get(key);
  if (existing) {
    existing.push(value);
    return;
  }
  map.set(key, [value]);
}

// ── Utility functions ───────────────────────────────────────────────────────

/** Roles that are always skipped — structural containers, never actionable */
const STRUCTURAL_ROLES = new Set(["webarea", "rootwebarea", "document", "none", "presentation"]);
function isStructuralRole(role: string): boolean {
  return STRUCTURAL_ROLES.has(role.toLowerCase());
}

/** Roles that are skipped when they have no accessible name */
const GENERIC_ROLES = new Set([
  "generic",
  "group",
  "article",
  "section",
  "region",
  "list",
  "listitem",
  "paragraph",
  "blockquote",
  "figure",
  "separator",
  "status",
]);
function isGenericRole(role: string): boolean {
  return GENERIC_ROLES.has(role.toLowerCase());
}

const ROLE_TAG_MAP: Record<string, string> = {
  button: "button",
  link: "a",
  textbox: "input",
  checkbox: "input",
  radio: "input",
  combobox: "select",
  listbox: "select",
  menuitem: "li",
  tab: "button",
  switch: "input",
  slider: "input",
  spinbutton: "input",
  searchbox: "input",
  heading: "h1",
  img: "img",
  navigation: "nav",
  banner: "header",
  contentinfo: "footer",
  main: "main",
  complementary: "aside",
};

function roleToTag(role: string): string {
  return ROLE_TAG_MAP[role] ?? "";
}

function detectRegion(ancestorRoles: string[]): SemanticRegion {
  // Walk ancestors from innermost to outermost looking for landmark roles
  for (let i = ancestorRoles.length - 1; i >= 0; i--) {
    const role = ancestorRoles[i]!;
    const region = LANDMARK_ROLE_MAP[role];
    if (region) return region as SemanticRegion;
  }
  return "unknown";
}

function buildSelectorHint(role: string, name: string, index: number): string {
  if (name) {
    return `role=${role}[name="${name}"]`;
  }
  return `role=${role}[index=${index}]`;
}

function findLabelForNode(
  nodeIndex: number,
  nodes: CDPDOMSnapshotDocument["nodes"],
  strings: string[],
  childrenMap: Map<number, number[]>
): string | undefined {
  // Check if parent is a <label>
  const parentIdx = nodes.parentIndex[nodeIndex] ?? -1;
  if (parentIdx >= 0) {
    const parentNameIdx = nodes.nodeName[parentIdx] ?? 0;
    const parentTag = (strings[parentNameIdx] ?? "").toLowerCase();
    if (parentTag === "label") {
      const labelText = extractNodeText(parentIdx, nodes, strings, childrenMap);
      if (labelText) return labelText;
    }
  }
  return undefined;
}

function buildChildrenMap(parentIndex: number[]): Map<number, number[]> {
  const map = new Map<number, number[]>();

  for (let i = 0; i < parentIndex.length; i++) {
    const parent = parentIndex[i] ?? -1;
    if (!map.has(parent)) {
      map.set(parent, []);
    }
    map.get(parent)!.push(i);
  }

  return map;
}

function extractNodeText(
  nodeIndex: number,
  nodes: CDPDOMSnapshotDocument["nodes"],
  strings: string[],
  childrenMap: Map<number, number[]>
): string | undefined {
  const childIndexes = childrenMap.get(nodeIndex) ?? [];
  const textParts: string[] = [];

  const walk = (currentIndex: number) => {
    if (nodes.nodeType[currentIndex] === 3) {
      const textIdx = nodes.nodeValue[currentIndex] ?? 0;
      const text = strings[textIdx] ?? "";
      if (text.trim()) {
        textParts.push(text);
      }
    }

    for (const childIndex of childrenMap.get(currentIndex) ?? []) {
      walk(childIndex);
    }
  };

  for (const childIndex of childIndexes) {
    walk(childIndex);
  }

  const text = normalizeAccessibleName(textParts.join(" "));
  return text || undefined;
}
