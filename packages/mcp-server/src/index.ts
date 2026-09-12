#!/usr/bin/env bun
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { bridgeWs } from "./ws-server";
import { saveAssetsToDisk } from "./asset-saver";
import { pruneFigmaNode } from "./token-pruner";

// 1. Initialize MCP Server
const server = new McpServer({
  name: "figma-live-mcp",
  version: "1.0.0",
});

// Tool 1: Inspect currently selected node in Figma
server.tool(
  "figma_get_selected",
  "Inspects the currently selected element in Figma in real-time. Extracts exact layout (flex/padding/gap), colors, typography, borders, and optionally exports icons (SVG) and images (PNG) directly to disk.",
  {
    export_assets: z
      .boolean()
      .optional()
      .default(false)
      .describe("Export vector icons as SVGs and images as PNGs to project assets"),
    assets_dir: z
      .string()
      .optional()
      .default("src/assets")
      .describe("Relative path to the project assets folder where files will be saved"),
  },
  async ({ export_assets, assets_dir }) => {
    try {
      const response = await bridgeWs.sendRequest({
        id: crypto.randomUUID(),
        type: "INSPECT_SELECTION",
        exportAssets: export_assets,
      });

      if (!response.success || !response.data) {
        return {
          content: [
            {
              type: "text",
              text: `Figma Error: ${response.error || "Failed to inspect selection"}`,
            },
          ],
          isError: true,
        };
      }

      // 1. Save assets to project disk if any were exported
      const savedAssets = await saveAssetsToDisk(response.data.assets, assets_dir);

      // 2. Prune AST to minimal token footprint (< 250 tokens)
      const cleanSummary = pruneFigmaNode(response.data, savedAssets);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(cleanSummary, null, 2),
          },
        ],
      };
    } catch (err: any) {
      return {
        content: [
          {
            type: "text",
            text: `Bridge Error: ${err.message || String(err)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool 2: Find and inspect a node by name
server.tool(
  "figma_find_node",
  "Finds and inspects a layer or frame in Figma by name (e.g. 'Navbar', 'Hero Section', 'Button/Primary'). Automatically selects and centers it in Figma canvas and extracts its design tokens and assets.",
  {
    name: z
      .string()
      .describe("The name or partial name of the frame, component or layer to inspect"),
    export_assets: z
      .boolean()
      .optional()
      .default(false)
      .describe("Export vector icons as SVGs and images as PNGs to project assets"),
    assets_dir: z
      .string()
      .optional()
      .default("src/assets")
      .describe("Relative path to the project assets folder where files will be saved"),
  },
  async ({ name, export_assets, assets_dir }) => {
    try {
      const response = await bridgeWs.sendRequest({
        id: crypto.randomUUID(),
        type: "INSPECT_NODE_BY_NAME",
        name,
        exportAssets: export_assets,
      });

      if (!response.success || !response.data) {
        return {
          content: [
            {
              type: "text",
              text: `Figma Error: ${response.error || `Could not find node '${name}'`}`,
            },
          ],
          isError: true,
        };
      }

      const savedAssets = await saveAssetsToDisk(response.data.assets, assets_dir);
      const cleanSummary = pruneFigmaNode(response.data, savedAssets);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(cleanSummary, null, 2),
          },
        ],
      };
    } catch (err: any) {
      return {
        content: [
          {
            type: "text",
            text: `Bridge Error: ${err.message || String(err)}`,
          },
        ],
        isError: true,
      };
    }
  }
);

// Tool 3: Check bridge connection status
server.tool(
  "figma_status",
  "Checks if the Figma Live Bridge plugin is currently connected and active on WebSocket localhost:4567.",
  {},
  async () => {
    const connected = bridgeWs.isConnected();
    const count = bridgeWs.getClientCount();
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(
            {
              connected,
              activeClients: count,
              port: 4567,
              message: connected
                ? `Figma plugin is actively connected (${count} session(s)). Ready to inspect.`
                : "Figma plugin is NOT connected. Open Figma and run 'Figma Live Bridge' plugin.",
            },
            null,
            2
          ),
        },
      ],
    };
  }
);

// 2. Start WebSocket Bridge server
bridgeWs.start();

// 3. Connect to Stdio Transport for MCP clients
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("[Figma Live Bridge] MCP Server connected via stdio transport.");
