import { expect, test } from "bun:test";
import { pruneFigmaNode } from "./token-pruner";
import type { FigmaRawNodeData } from "../../shared/src/types";

function node(id: string, children: FigmaRawNodeData[] = []): FigmaRawNodeData {
  return {
    id, name: id, type: "FRAME", width: 100, height: 40,
    layout: { layoutMode: "NONE", padding: { top: 0, right: 0, bottom: 0, left: 0 }, itemSpacing: 0 },
    styles: { fills: [], strokes: [], effects: [] },
    typography: [], assets: [], childrenCount: children.length, children,
  };
}

test("prunes every layer while preserving order, identity and nested styles", () => {
  const text = node("text");
  text.type = "TEXT";
  text.typography = [{ characters: "Hello", fontFamily: "Inter", fontWeight: "Bold", fontSize: 16 }];
  text.styles.fills = [{ type: "SOLID", colorHex: "#123456" }];
  const parent = node("parent", [node("group", [text]), node("sibling")]);
  const result = pruneFigmaNode(parent, ["./assets/icon.svg"]);
  expect(result.id).toBe("parent");
  expect(result.children.map((c) => c.id)).toEqual(["group", "sibling"]);
  expect(result.children[0].children[0]).toMatchObject({
    id: "text", type: "TEXT", visuals: { background: "#123456" },
    typography: [{ text: "Hello", size: "16px" }], children: [],
  });
  expect(result.savedAssets).toEqual(["./assets/icon.svg"]);
  expect(result.children[0].savedAssets).toEqual([]);
});
