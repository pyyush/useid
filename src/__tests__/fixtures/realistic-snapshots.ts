import type { AccessibilitySnapshotResult, DOMSnapshotResult } from "../../snapshot-types.js";
import type { FramePathEntry } from "../../types.js";

function makeAXSnapshot(tree: unknown): AccessibilitySnapshotResult {
  return { tree, hash: "fixture-ax", serialized: "{}" };
}

function makeDOMSnapshot(snapshot: unknown): DOMSnapshotResult {
  return { snapshot, hash: "fixture-dom", serialized: "{}" };
}

export const realisticPageUrl = "https://example.com/page";
export const sameOriginFramePath: FramePathEntry[] = [
  { url: "https://example.com/account-frame", index: 0 },
];

export const wrapperLayoutChurnFixture = {
  before: {
    accessibilitySnapshot: makeAXSnapshot({
      role: "WebArea",
      name: "Checkout",
      children: [
        {
          role: "group",
          name: "",
          children: [
            { role: "button", name: "Continue" },
            { role: "button", name: "Back" },
          ],
        },
      ],
    }),
    domSnapshot: makeDOMSnapshot({
      documents: [
        {
          nodes: {
            parentIndex: [-1, 0, 1, 2, 3, 4, 3, 6],
            nodeType: [1, 1, 1, 1, 1, 3, 1, 3],
            nodeName: [0, 1, 2, 3, 4, 5, 4, 5],
            nodeValue: [5, 5, 5, 5, 5, 6, 5, 7],
            backendNodeId: [1, 2, 3, 4, 5, 6, 7, 8],
          },
          layout: {
            nodeIndex: [0, 1, 2, 3, 4, 6],
            bounds: [
              [0, 0, 1024, 768],
              [0, 0, 1024, 768],
              [80, 240, 420, 220],
              [90, 260, 380, 180],
              [120, 310, 140, 44],
              [280, 310, 100, 44],
            ],
          },
        },
      ],
      strings: ["html", "body", "div", "form", "button", "", "Continue", "Back"],
    }),
  },
  after: {
    accessibilitySnapshot: makeAXSnapshot({
      role: "WebArea",
      name: "Checkout",
      children: [
        {
          role: "group",
          name: "",
          children: [
            {
              role: "group",
              name: "",
              children: [
                { role: "button", name: "Continue" },
                { role: "button", name: "Back" },
              ],
            },
          ],
        },
      ],
    }),
    domSnapshot: makeDOMSnapshot({
      documents: [
        {
          nodes: {
            parentIndex: [-1, 0, 1, 2, 3, 4, 5, 4, 7],
            nodeType: [1, 1, 1, 1, 1, 1, 3, 1, 3],
            nodeName: [0, 1, 2, 8, 3, 4, 5, 4, 5],
            nodeValue: [5, 5, 5, 5, 5, 5, 6, 5, 7],
            backendNodeId: [11, 12, 13, 14, 15, 16, 17, 18, 19],
          },
          layout: {
            nodeIndex: [0, 1, 2, 3, 4, 5, 7],
            bounds: [
              [0, 0, 1024, 768],
              [0, 0, 1024, 768],
              [110, 265, 450, 240],
              [120, 280, 430, 220],
              [130, 295, 390, 190],
              [160, 350, 140, 44],
              [320, 350, 100, 44],
            ],
          },
        },
      ],
      strings: ["html", "body", "div", "form", "button", "", "Continue", "Back", "section"],
    }),
  },
};

export const duplicateSameNameFixture = {
  before: {
    accessibilitySnapshot: makeAXSnapshot({
      role: "WebArea",
      name: "Review",
      children: [
        {
          role: "group",
          name: "",
          children: [
            { role: "button", name: "Approve" },
            { role: "button", name: "Cancel" },
          ],
        },
      ],
    }),
    domSnapshot: makeDOMSnapshot({
      documents: [
        {
          nodes: {
            parentIndex: [-1, 0, 1, 2, 3, 4, 3, 6],
            nodeType: [1, 1, 1, 1, 1, 3, 1, 3],
            nodeName: [0, 1, 2, 3, 4, 5, 4, 5],
            nodeValue: [5, 5, 5, 5, 5, 6, 5, 7],
            backendNodeId: [21, 22, 23, 24, 25, 26, 27, 28],
          },
          layout: {
            nodeIndex: [0, 1, 2, 3, 4, 6],
            bounds: [
              [0, 0, 1024, 768],
              [0, 0, 1024, 768],
              [40, 80, 360, 180],
              [50, 90, 330, 150],
              [100, 140, 120, 40],
              [240, 140, 100, 40],
            ],
          },
        },
      ],
      strings: ["html", "body", "div", "form", "button", "", "Approve", "Cancel"],
    }),
  },
  after: {
    accessibilitySnapshot: makeAXSnapshot({
      role: "WebArea",
      name: "Review",
      children: [
        {
          role: "group",
          name: "",
          children: [
            { role: "button", name: "Approve" },
            { role: "button", name: "Approve" },
            { role: "button", name: "Cancel" },
          ],
        },
      ],
    }),
    domSnapshot: makeDOMSnapshot({
      documents: [
        {
          nodes: {
            parentIndex: [-1, 0, 1, 2, 3, 4, 3, 6, 3, 8],
            nodeType: [1, 1, 1, 1, 1, 3, 1, 3, 1, 3],
            nodeName: [0, 1, 2, 3, 4, 5, 4, 5, 4, 5],
            nodeValue: [5, 5, 5, 5, 5, 6, 5, 6, 5, 7],
            backendNodeId: [31, 32, 33, 34, 35, 36, 37, 38, 39, 40],
          },
          layout: {
            nodeIndex: [0, 1, 2, 3, 4, 6, 8],
            bounds: [
              [0, 0, 1024, 768],
              [0, 0, 1024, 768],
              [40, 80, 420, 180],
              [50, 90, 390, 150],
              [100, 140, 120, 40],
              [112, 142, 120, 40],
              [260, 140, 100, 40],
            ],
          },
        },
      ],
      strings: ["html", "body", "div", "form", "button", "", "Approve", "Cancel"],
    }),
  },
};

export const missingRoleAndNameFixture = {
  accessibilitySnapshot: makeAXSnapshot({
    role: "WebArea",
    name: "Checkout",
    children: [{ role: "generic", name: "" }],
  }),
  domSnapshot: makeDOMSnapshot({
    documents: [
      {
        nodes: {
          parentIndex: [-1, 0, 1],
          nodeType: [1, 1, 1],
          nodeName: [0, 1, 2],
          nodeValue: [3, 3, 3],
          backendNodeId: [41, 42, 43],
        },
        layout: {
          nodeIndex: [0, 1, 2],
          bounds: [
            [0, 0, 1024, 768],
            [0, 0, 1024, 768],
            [100, 100, 240, 80],
          ],
        },
      },
    ],
    strings: ["html", "body", "div", ""],
  }),
};

export const sameOriginIframeFixture = {
  accessibilitySnapshot: makeAXSnapshot({
    role: "WebArea",
    name: "Account Frame",
    children: [
      { role: "button", name: "Save Settings" },
      { role: "button", name: "Cancel" },
    ],
  }),
  domSnapshot: makeDOMSnapshot({
    documents: [
      {
        nodes: {
          parentIndex: [-1, 0, 1, 2, 1, 4],
          nodeType: [1, 1, 1, 3, 1, 3],
          nodeName: [0, 1, 2, 3, 2, 3],
          nodeValue: [3, 3, 3, 4, 3, 5],
          backendNodeId: [51, 52, 53, 54, 55, 56],
        },
        layout: {
          nodeIndex: [0, 1, 2, 4],
          bounds: [
            [0, 0, 1024, 768],
            [0, 0, 480, 320],
            [40, 80, 160, 44],
            [220, 80, 120, 44],
          ],
        },
      },
    ],
    strings: ["html", "body", "button", "", "Save Settings", "Cancel"],
  }),
};

export const openShadowFixture = {
  accessibilitySnapshot: makeAXSnapshot({
    role: "WebArea",
    name: "Shadow Demo",
    children: [{ role: "button", name: "Shadow Action" }],
  }),
  domSnapshot: makeDOMSnapshot({
    documents: [
      {
        nodes: {
          parentIndex: [-1, 0, 1, 2, 3, 4],
          nodeType: [1, 1, 1, 11, 1, 3],
          nodeName: [0, 1, 2, 3, 4, 5],
          nodeValue: [5, 5, 5, 5, 5, 6],
          backendNodeId: [61, 62, 63, 64, 65, 66],
        },
        layout: {
          nodeIndex: [0, 1, 2, 4],
          bounds: [
            [0, 0, 1024, 768],
            [0, 0, 1024, 768],
            [300, 200, 220, 120],
            [320, 235, 160, 44],
          ],
        },
      },
    ],
    strings: ["html", "body", "my-widget", "#document-fragment", "button", "", "Shadow Action"],
  }),
};

export const closedShadowFixture = {
  accessibilitySnapshot: makeAXSnapshot({
    role: "WebArea",
    name: "Shadow Demo",
    children: [{ role: "button", name: "Shadow Action" }],
  }),
  domSnapshot: makeDOMSnapshot({
    documents: [
      {
        nodes: {
          parentIndex: [-1, 0, 1],
          nodeType: [1, 1, 1],
          nodeName: [0, 1, 2],
          nodeValue: [3, 3, 3],
          backendNodeId: [71, 72, 73],
        },
        layout: {
          nodeIndex: [0, 1, 2],
          bounds: [
            [0, 0, 1024, 768],
            [0, 0, 1024, 768],
            [300, 200, 220, 120],
          ],
        },
      },
    ],
    strings: ["html", "body", "my-widget", ""],
  }),
};
