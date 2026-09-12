/// <reference types="@figma/plugin-typings" />

// Show minimal dockable UI
figma.showUI(__html__, {
  width: 280,
  height: 160,
  title: "Figma Live Bridge",
  themeColors: true,
});

// Helper: Extract node ID from URL or raw ID string
function extractNodeId(input: string): string | null {
  const trimmed = input.trim();
  // Check if full Figma URL: e.g. ...?node-id=123-456 or ...?node-id=123%3A456
  const urlMatch = trimmed.match(/[?&]node-id=([^&#]+)/);
  if (urlMatch) {
    const rawId = decodeURIComponent(urlMatch[1]);
    return rawId.replace(/-/g, ":");
  }
  // Check if raw node ID like "123:456" or "123-456"
  if (/^\d+[:-]\d+$/.test(trimmed)) {
    return trimmed.replace(/-/g, ":");
  }
  return null;
}

// Helper: Convert Figma 0..1 color to Hex string
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => {
    const val = Math.round(Math.max(0, Math.min(1, n)) * 255);
    return val.toString(16).padStart(2, "0");
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

// Helper: Convert Uint8Array to base64
function uint8ArrayToBase64(bytes: Uint8Array): string {
  return figma.base64Encode(bytes);
}

// Helper: Convert Effect to CSS box-shadow
function effectToCss(effect: Effect): string | undefined {
  if (effect.type !== "DROP_SHADOW" && effect.type !== "INNER_SHADOW") return undefined;
  if (!effect.visible) return undefined;
  
  const inset = effect.type === "INNER_SHADOW" ? "inset " : "";
  const x = Math.round(effect.offset.x);
  const y = Math.round(effect.offset.y);
  const blur = Math.round(effect.radius);
  const spread = Math.round(effect.spread || 0);
  const color = effect.color;
  const alpha = Math.round(color.a * 100) / 100;
  
  return `${inset}${x}px ${y}px ${blur}px ${spread}px rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, ${alpha})`;
}

// Recursively collect text items inside a node
function extractTypography(node: SceneNode): any[] {
  const items: any[] = [];

  if (node.type === "TEXT") {
    const fontName = node.fontName !== figma.mixed ? node.fontName : { family: "Inter", style: "Regular" };
    const fontSize = node.fontSize !== figma.mixed ? node.fontSize : 14;
    
    let colorHex: string | undefined;
    if (node.fills !== figma.mixed && Array.isArray(node.fills) && node.fills.length > 0) {
      const fill = node.fills[0];
      if (fill.type === "SOLID") {
        colorHex = rgbToHex(fill.color.r, fill.color.g, fill.color.b);
      }
    }

    let lineHeightPx: number | undefined;
    if (node.lineHeight !== figma.mixed && typeof node.lineHeight === "object") {
      if (node.lineHeight.unit === "PIXELS") {
        lineHeightPx = Math.round(node.lineHeight.value);
      }
    }

    items.push({
      characters: node.characters,
      fontFamily: fontName.family,
      fontWeight: fontName.style,
      fontSize: typeof fontSize === "number" ? Math.round(fontSize) : 14,
      lineHeightPx,
      colorHex,
    });
  }

  if ("children" in node) {
    for (const child of (node as ChildrenMixin).children) {
      items.push(...extractTypography(child));
    }
  }

  return items;
}

// Export icons and images
async function extractAssets(node: SceneNode, exportAssets: boolean): Promise<any[]> {
  if (!exportAssets) return [];
  const assets: any[] = [];

  async function walk(current: SceneNode) {
    const isIconLike = 
      current.type === "VECTOR" ||
      current.type === "BOOLEAN_OPERATION" ||
      current.name.toLowerCase().includes("icon") ||
      current.name.toLowerCase().includes("logo") ||
      current.name.endsWith(".svg");

    if (isIconLike && "exportAsync" in current) {
      try {
        const svgBytes = await current.exportAsync({ format: "SVG" });
        assets.push({
          nodeId: current.id,
          name: current.name.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase(),
          format: "svg",
          dataBase64: uint8ArrayToBase64(svgBytes),
        });
        return; // Don't traverse children of an exported SVG icon
      } catch (e) {
        console.warn("Could not export icon:", current.name, e);
      }
    }

    // Check for image fills
    if ("fills" in current && current.fills !== figma.mixed && Array.isArray(current.fills)) {
      const hasImage = current.fills.some(f => f.type === "IMAGE");
      if (hasImage && "exportAsync" in current) {
        try {
          const pngBytes = await current.exportAsync({ format: "PNG", constraint: { type: "SCALE", value: 2 } });
          assets.push({
            nodeId: current.id,
            name: `${current.name.replace(/[^a-zA-Z0-9_-]/g, "_").toLowerCase()}_img`,
            format: "png",
            dataBase64: uint8ArrayToBase64(pngBytes),
          });
          return;
        } catch (e) {
          console.warn("Could not export image fill:", current.name, e);
        }
      }
    }

    if ("children" in current) {
      for (const child of (current as ChildrenMixin).children) {
        await walk(child);
      }
    }
  }

  await walk(node);
  return assets;
}

// Extract full design properties of a node
async function inspectNode(node: SceneNode, exportAssets: boolean = false): Promise<any> {
  const width = Math.round(node.width);
  const height = Math.round(node.height);

  // Auto-layout properties
  const layout = {
    layoutMode: "layoutMode" in node ? (node as FrameNode).layoutMode : "NONE",
    padding: {
      top: "paddingTop" in node ? Math.round((node as FrameNode).paddingTop) : 0,
      right: "paddingRight" in node ? Math.round((node as FrameNode).paddingRight) : 0,
      bottom: "paddingBottom" in node ? Math.round((node as FrameNode).paddingBottom) : 0,
      left: "paddingLeft" in node ? Math.round((node as FrameNode).paddingLeft) : 0,
    },
    itemSpacing: "itemSpacing" in node ? Math.round((node as FrameNode).itemSpacing) : 0,
    primaryAxisAlignItems: "primaryAxisAlignItems" in node ? (node as FrameNode).primaryAxisAlignItems : undefined,
    counterAxisAlignItems: "counterAxisAlignItems" in node ? (node as FrameNode).counterAxisAlignItems : undefined,
  };

  // Fills (Colors)
  const fills: any[] = [];
  if ("fills" in node && node.fills !== figma.mixed && Array.isArray(node.fills)) {
    for (const fill of node.fills) {
      if (fill.visible !== false && fill.type === "SOLID") {
        fills.push({
          type: "SOLID",
          colorHex: rgbToHex(fill.color.r, fill.color.g, fill.color.b),
          opacity: fill.opacity ?? 1,
        });
      }
    }
  }

  // Strokes (Borders)
  const strokes: any[] = [];
  if ("strokes" in node && Array.isArray(node.strokes)) {
    const weight = "strokeWeight" in node && typeof node.strokeWeight === "number" ? node.strokeWeight : 1;
    for (const stroke of node.strokes) {
      if (stroke.visible !== false && stroke.type === "SOLID") {
        strokes.push({
          type: "SOLID",
          colorHex: rgbToHex(stroke.color.r, stroke.color.g, stroke.color.b),
          weight: Math.round(weight),
          opacity: stroke.opacity ?? 1,
        });
      }
    }
  }

  // Corner radius
  let cornerRadius: number | number[] | undefined;
  if ("cornerRadius" in node) {
    if (typeof node.cornerRadius === "number") {
      cornerRadius = Math.round(node.cornerRadius);
    } else if (node.cornerRadius === figma.mixed && "topLeftRadius" in node) {
      const f = node as FrameNode;
      cornerRadius = [
        Math.round(f.topLeftRadius),
        Math.round(f.topRightRadius),
        Math.round(f.bottomRightRadius),
        Math.round(f.bottomLeftRadius),
      ];
    }
  }

  // Effects (Shadows)
  const effects: any[] = [];
  if ("effects" in node && Array.isArray(node.effects)) {
    for (const effect of node.effects) {
      const css = effectToCss(effect);
      if (css) {
        effects.push({
          type: effect.type,
          css,
        });
      }
    }
  }

  // Typography
  const typography = extractTypography(node);

  // Export vector assets and images
  const assets = await extractAssets(node, exportAssets);

  const childrenCount = "children" in node ? (node as ChildrenMixin).children.length : 0;

  return {
    id: node.id,
    name: node.name,
    type: node.type,
    width,
    height,
    layout,
    styles: {
      fills,
      strokes,
      cornerRadius,
      effects,
    },
    typography,
    assets,
    childrenCount,
  };
}

// Broadcast selection change to UI
function notifySelection() {
  const selection = figma.currentPage.selection;
  if (selection.length > 0) {
    const first = selection[0];
    figma.ui.postMessage({
      type: "SELECTION_CHANGED",
      node: {
        id: first.id,
        name: first.name,
        type: first.type,
        width: first.width,
        height: first.height,
      },
    });
  } else {
    figma.ui.postMessage({
      type: "SELECTION_CHANGED",
      node: null,
    });
  }
}

figma.on("selectionchange", notifySelection);
notifySelection();

// Handle commands from MCP server through UI
figma.ui.onmessage = async (msg) => {
  if (!msg || !msg.type) return;

  // 1. Inspect active selection
  if (msg.type === "INSPECT_SELECTION") {
    const selection = figma.currentPage.selection;
    if (selection.length === 0) {
      figma.ui.postMessage({
        id: msg.id,
        type: "INSPECT_RESPONSE",
        success: false,
        error: "No element is currently selected in Figma. Please click on a frame or layer.",
      });
      return;
    }

    try {
      const data = await inspectNode(selection[0], Boolean(msg.exportAssets));
      figma.ui.postMessage({
        id: msg.id,
        type: "INSPECT_RESPONSE",
        success: true,
        data,
      });
    } catch (err: any) {
      figma.ui.postMessage({
        id: msg.id,
        type: "INSPECT_RESPONSE",
        success: false,
        error: err?.message || String(err),
      });
    }
    return;
  }

  // 2. Inspect by Node ID (from URL or direct ID)
  if (msg.type === "INSPECT_NODE_BY_ID") {
    const targetId = (msg.nodeId || "").replace(/-/g, ":").trim();
    const found = figma.getNodeById(targetId) as SceneNode | null;

    if (!found) {
      figma.ui.postMessage({
        id: msg.id,
        type: "INSPECT_RESPONSE",
        success: false,
        error: `Could not find any node with ID "${targetId}" in this file.`,
      });
      return;
    }

    // Select and center in viewport
    figma.currentPage.selection = [found];
    figma.viewport.scrollAndZoomIntoView([found]);

    try {
      const data = await inspectNode(found, Boolean(msg.exportAssets));
      figma.ui.postMessage({
        id: msg.id,
        type: "INSPECT_RESPONSE",
        success: true,
        data,
      });
    } catch (err: any) {
      figma.ui.postMessage({
        id: msg.id,
        type: "INSPECT_RESPONSE",
        success: false,
        error: err?.message || String(err),
      });
    }
    return;
  }

  // 3. Inspect by Name OR Smart URL detection
  if (msg.type === "INSPECT_NODE_BY_NAME") {
    const input = (msg.name || "").trim();
    if (!input) {
      figma.ui.postMessage({
        id: msg.id,
        type: "INSPECT_RESPONSE",
        success: false,
        error: "Target name or URL is empty.",
      });
      return;
    }

    // Check if input is a Figma URL or Node ID
    const extractedId = extractNodeId(input);
    if (extractedId) {
      const found = figma.getNodeById(extractedId) as SceneNode | null;
      if (found) {
        figma.currentPage.selection = [found];
        figma.viewport.scrollAndZoomIntoView([found]);

        try {
          const data = await inspectNode(found, Boolean(msg.exportAssets));
          figma.ui.postMessage({
            id: msg.id,
            type: "INSPECT_RESPONSE",
            success: true,
            data,
          });
        } catch (err: any) {
          figma.ui.postMessage({
            id: msg.id,
            type: "INSPECT_RESPONSE",
            success: false,
            error: err?.message || String(err),
          });
        }
        return;
      }
    }

    // Fallback: search by name
    const query = input.toLowerCase();
    let found: SceneNode | null = figma.currentPage.findOne((n) =>
      n.name.toLowerCase().includes(query)
    );

    if (!found) {
      for (const page of figma.root.children) {
        found = page.findOne((n) => n.name.toLowerCase().includes(query));
        if (found) {
          await figma.setCurrentPageAsync(page);
          break;
        }
      }
    }

    if (!found) {
      figma.ui.postMessage({
        id: msg.id,
        type: "INSPECT_RESPONSE",
        success: false,
        error: `Could not find any layer or frame matching "${input}".`,
      });
      return;
    }

    figma.currentPage.selection = [found];
    figma.viewport.scrollAndZoomIntoView([found]);

    try {
      const data = await inspectNode(found, Boolean(msg.exportAssets));
      figma.ui.postMessage({
        id: msg.id,
        type: "INSPECT_RESPONSE",
        success: true,
        data,
      });
    } catch (err: any) {
      figma.ui.postMessage({
        id: msg.id,
        type: "INSPECT_RESPONSE",
        success: false,
        error: err?.message || String(err),
      });
    }
  }
};
