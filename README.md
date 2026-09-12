# ⚡ Figma Live Bridge MCP

> **Zero API Key, Real-Time Figma Bridge for AI Coding Agents (Antigravity, Claude, OpenCode, Codex, Cursor).**  
> Inspect frames, extract design tokens, and export SVG/PNG assets directly to your project in real-time — without paying for Dev Mode, managing tokens, or downloading ZIP files.

---

## 🚀 Key Highlights

* 🟢 **Zero API Key / Zero Cost**: No Figma Personal Access Tokens, no OAuth, no rate limits, no enterprise paywalls.
* ⚡ **Live WebSocket Sync**: Connects directly to your running Figma session. No manual ZIP exporting or file copying.
* 🎯 **Token-Efficient by Design**: Prunes 95% of Figma's heavy internal scene graph and returns a compact, high-level summary (< 250 tokens).
* 📦 **Automatic Asset Exports**: Vector icons are saved as clean `.svg` and images as `.png` directly into your project's `./src/assets` folder.
* 🌐 **Universal Protocol**: Built on the official Model Context Protocol (MCP), compatible across **Antigravity**, **Claude Code**, **Claude Desktop**, **OpenCode**, and **Codex**.

---

## 📁 Repository Structure

```
figma-live-mcp/
├── packages/
│   ├── shared/            # Shared TypeScript interfaces & types
│   ├── figma-plugin/      # Local Figma plugin (manifest.json + UI + code.ts)
│   └── mcp-server/        # MCP Server in Bun (WebSocket + stdio + Token Pruner)
└── dist/
    └── figma-live-mcp     # Self-contained native binary (compiled with Bun)
```

---

## 🛠️ 1-Minute Setup

### 1. Load the Plugin in Figma

1. Open Figma (Desktop app or Web).
2. Go to **Menu (F)** → **Plugins** → **Development** → **Import plugin from manifest...**
3. Select `packages/figma-plugin/manifest.json` from this repository.
4. Run the plugin (**Plugins** → **Development** → **Figma Live Bridge**).
   * A small window will appear with a live status indicator showing the active selection.

---

### 2. Configure Your AI Assistants

Add the MCP server to your AI tool's MCP configuration:

#### A. In Google Antigravity
Add to your Antigravity MCP settings or sidecar configuration:
```json
{
  "mcpServers": {
    "figma-live": {
      "command": "/Users/roca/Documents/figma-live-mcp/dist/figma-live-mcp"
    }
  }
}
```
*(Or use `bun run /Users/roca/Documents/figma-live-mcp/packages/mcp-server/src/index.ts`)*

#### B. In Claude Desktop (`~/Library/Application Support/Claude/claude_desktop_config.json`)
```json
{
  "mcpServers": {
    "figma-live": {
      "command": "/Users/roca/Documents/figma-live-mcp/dist/figma-live-mcp"
    }
  }
}
```

#### C. In Claude Code / OpenCode / Codex
Run or configure:
```bash
claude mcp add figma-live /Users/roca/Documents/figma-live-mcp/dist/figma-live-mcp
```

---

## 🧰 Available MCP Tools

| Tool | Description |
| :--- | :--- |
| `figma_get_selected` | Inspects currently selected element in Figma. Extracts layout (flexbox, padding, gap), colors, typography, borders, shadows, and optionally exports assets to disk. |
| `figma_find_node` | Searches for a frame or layer by name (e.g., `"Hero Section"` or `"Navbar"`), selects it on canvas, and returns its design tokens and assets. |
| `figma_status` | Returns whether the Figma plugin is currently connected to the local WebSocket server. |

---

## 💡 How to Use with AI Agents

Once configured, simply talk to your assistant naturally:

* *"Crea el componente React para el botón que tengo seleccionado en Figma con sus estilos de Tailwind."*
* *"Inspecciona el frame 'Navbar' en Figma, descarga sus iconos a `src/assets/icons` y genera el componente."*
* *"Revisa los colores del diseño en Figma y compáralos con las variables de mi `theme.css`."*

---

## 🔨 Development & Rebuilding

To rebuild the plugin and server:

```bash
# Install dependencies
bun install

# Build everything
bun run build

# Compile standalone native binary
bun run compile
```

## 📄 License
MIT © Mario Roca (marioccarloss)
