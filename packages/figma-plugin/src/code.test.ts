import { expect, test } from "bun:test";

const messages: any[] = [];
const mixed = Symbol("mixed");
const leaf = (id: string, name: string, type = "RECTANGLE") => ({
  id, name, type, width: 10, height: 20, fills: [], strokes: [], effects: [],
});

let deep: any = { ...leaf("deep-10", "Deep text", "TEXT"), characters: "nested content",
  fontName: { family: "Inter", style: "Bold" }, fontSize: 16, lineHeight: { unit: "PIXELS", value: 20 } };
for (let i = 9; i >= 0; i--) {
  deep = { ...leaf(`deep-${i}`, `Level ${i}`, "GROUP"), children: [deep] };
}
const siblings = Array.from({ length: 30 }, (_, i) => leaf(`sibling-${i}`, `Sibling ${i}`));
const parent = { ...leaf("root", "Parent", "FRAME"), children: [deep, ...siblings] };

(globalThis as any).__html__ = "";
(globalThis as any).figma = {
  mixed,
  base64Encode: () => "",
  showUI: () => {},
  currentPage: { selection: [parent] },
  ui: { postMessage: (msg: any) => messages.push(msg), onmessage: null },
  on: () => {},
};
await import("./code");

test("inspecting a parent returns every descendant without truncation or duplicated typography", async () => {
  await (globalThis as any).figma.ui.onmessage({ id: "request", type: "INSPECT_SELECTION" });
  const response = messages.find((msg) => msg.id === "request");
  expect(response.success).toBe(true);
  expect(response.data.childrenCount).toBe(31);
  expect(response.data.children).toHaveLength(31);
  expect(response.data.children[30].id).toBe("sibling-29");
  let current = response.data.children[0];
  for (let i = 0; i < 10; i++) {
    expect(current.id).toBe(`deep-${i}`);
    expect(current.typography).toEqual([]);
    current = current.children[0];
  }
  expect(current.id).toBe("deep-10");
  expect(current.typography[0].characters).toBe("nested content");
  expect(current.children).toEqual([]);
  expect(response.data.typography).toEqual([]);
});
