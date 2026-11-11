import type { CleanTokenSummary, FigmaRawNodeData } from "../../shared/src/types";

function formatPaddingShorthand(p: { top: number; right: number; bottom: number; left: number }): string | undefined {
  if (p.top === 0 && p.right === 0 && p.bottom === 0 && p.left === 0) return undefined;
  if (p.top === p.bottom && p.right === p.left) {
    if (p.top === p.right) return `${p.top}px`;
    return `${p.top}px ${p.right}px`;
  }
  return `${p.top}px ${p.right}px ${p.bottom}px ${p.left}px`;
}

function formatBorderRadius(r?: number | number[]): string | undefined {
  if (r === undefined) return undefined;
  if (typeof r === "number") {
    return r > 0 ? `${r}px` : undefined;
  }
  if (Array.isArray(r)) {
    if (r.every((v) => v === 0)) return undefined;
    return r.map((v) => `${v}px`).join(" ");
  }
  return undefined;
}

export function pruneFigmaNode(
  raw: FigmaRawNodeData,
  savedAssets: string[] = []
): CleanTokenSummary {
  // 1. Layout distillation
  const isFlex = raw.layout.layoutMode !== "NONE";
  const layout: CleanTokenSummary["layout"] = {
    display: isFlex ? "flex" : "block",
  };

  if (isFlex) {
    layout.flexDirection = raw.layout.layoutMode === "HORIZONTAL" ? "row" : "column";
    if (raw.layout.itemSpacing > 0) {
      layout.gap = `${raw.layout.itemSpacing}px`;
    }
    const paddingStr = formatPaddingShorthand(raw.layout.padding);
    if (paddingStr) {
      layout.padding = paddingStr;
    }
    if (raw.layout.primaryAxisAlignItems) {
      layout.justifyContent = raw.layout.primaryAxisAlignItems.toLowerCase();
    }
    if (raw.layout.counterAxisAlignItems) {
      layout.alignItems = raw.layout.counterAxisAlignItems.toLowerCase();
    }
  }

  // 2. Visual styling
  const visuals: CleanTokenSummary["visuals"] = {};

  // Background
  const solidFill = raw.styles.fills.find((f) => f.type === "SOLID" && f.colorHex);
  if (solidFill?.colorHex) {
    visuals.background = solidFill.opacity && solidFill.opacity < 1 
      ? `${solidFill.colorHex} (opacity: ${solidFill.opacity})` 
      : solidFill.colorHex;
  }

  // Border Radius
  const radius = formatBorderRadius(raw.styles.cornerRadius);
  if (radius) visuals.borderRadius = radius;

  // Border (Strokes)
  const solidStroke = raw.styles.strokes.find((s) => s.type === "SOLID" && s.colorHex);
  if (solidStroke?.colorHex) {
    visuals.border = `${solidStroke.weight || 1}px solid ${solidStroke.colorHex}`;
  }

  // Box Shadow (Effects)
  const shadowEffect = raw.styles.effects.find((e) => e.css);
  if (shadowEffect?.css) {
    visuals.boxShadow = shadowEffect.css;
  }

  // 3. Compact typography
  // Deduplicate and trim text elements
  const seenTexts = new Set<string>();
  const typography: CleanTokenSummary["typography"] = [];

  for (const t of raw.typography) {
    const key = `${t.characters}|${t.fontSize}|${t.fontWeight}|${t.colorHex}`;
    if (!seenTexts.has(key)) {
      seenTexts.add(key);
      typography.push({
        text: t.characters.length > 60 ? `${t.characters.slice(0, 57)}...` : t.characters,
        font: t.fontFamily,
        size: `${t.fontSize}px`,
        weight: t.fontWeight,
        color: t.colorHex || "#000000",
      });
    }
  }

  return {
    id: raw.id,
    component: raw.name,
    type: raw.type,
    dimensions: { width: raw.width, height: raw.height },
    layout,
    visuals,
    typography,
    savedAssets,
    children: (raw.children ?? []).map((child) => pruneFigmaNode(child)),
  };
}
