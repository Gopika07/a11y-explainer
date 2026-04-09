/// <reference path="../node_modules/@figma/plugin-typings/index.d.ts" />

figma.showUI(__html__, { width: 380, height: 520 });

figma.ui.onmessage = async (msg) => {
  if (msg.type === "run-audit") {
    const selection = figma.currentPage.selection;

    if (selection.length === 0) {
      figma.ui.postMessage({ type: "error", message: "Select a frame first." });
      return;
    }

    const node = selection[0];
    if (node.type !== "FRAME" && node.type !== "COMPONENT" && node.type !== "GROUP") {
      figma.ui.postMessage({ type: "error", message: "Please select a frame, component, or group." });
      return;
    }

    const issues: RawIssue[] = [];
    scanNode(node, issues);
    figma.ui.postMessage({ type: "raw-issues", issues });
  }
};

interface RawIssue {
  layerName: string;
  type: "contrast" | "alt-text" | "touch-target" | "font-size";
  details: string;
  severity: "critical" | "warning";
}

function scanNode(node: SceneNode, issues: RawIssue[]) {
  // Check text nodes
  if (node.type === "TEXT") {
    // Font size check
    const fontSize = node.fontSize;
    if (typeof fontSize === "number" && fontSize < 12) {
      issues.push({
        layerName: node.name,
        type: "font-size",
        details: `Font size is ${fontSize}px`,
        severity: "warning",
      });
    }

    // Contrast check — basic version using fills
    const fills = node.fills;
    if (Array.isArray(fills) && fills.length > 0) {
      const fill = fills[0];
      if (fill.type === "SOLID") {
        const { r, g, b } = fill.color;
        const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        // Flag anything that looks very light (likely low contrast)
        if (luminance > 0.7) {
          issues.push({
            layerName: node.name,
            type: "contrast",
            details: `Text colour appears very light (luminance ${luminance.toFixed(2)}). May fail contrast requirements.`,
            severity: "critical",
          });
        }
      }
    }
  }

  // Check images for alt text (via plugin data or name convention)
  if (node.type === "RECTANGLE" || node.type === "ELLIPSE") {
    const fills = node.fills;
    if (Array.isArray(fills) && fills.some((f) => f.type === "IMAGE")) {
      const altText = node.getPluginData("altText");
      if (!altText || altText.trim() === "") {
        issues.push({
          layerName: node.name,
          type: "alt-text",
          details: `Image layer has no alt text set.`,
          severity: "critical",
        });
      }
    }
  }

  // Touch target check — anything named like a button
  const buttonKeywords = ["button", "btn", "cta", "icon", "tap", "click"];
  const nameLower = node.name.toLowerCase();
  if (buttonKeywords.some((k) => nameLower.includes(k))) {
    if ("width" in node && "height" in node) {
      if (node.width < 44 || node.height < 44) {
        issues.push({
          layerName: node.name,
          type: "touch-target",
          details: `Touch target is ${Math.round(node.width)}×${Math.round(node.height)}px. Minimum recommended is 44×44px.`,
          severity: "warning",
        });
      }
    }
  }

  // Recurse into children
  if ("children" in node) {
    for (const child of node.children) {
      scanNode(child, issues);
    }
  }
}
