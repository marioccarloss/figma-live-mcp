# Figma Live Bridge MCP — Guía de instalación y uso

Este MCP conecta tu agente de IA (Claude Code, Claude Desktop, Cursor, OpenCode, Codex…) con la sesión de Figma que tienes abierta. **No necesita token de Figma ni Dev Mode**: un plugin local de Figma habla por WebSocket (`localhost:4567`) con un servidor MCP que corre en tu máquina.

```
Figma (plugin "Figma Live Bridge")  <──ws://localhost:4567──>  figma-live-mcp  <──stdio──>  Tu agente IA
```

---

## 1. Requisitos

| Requisito | Cómo comprobarlo |
|---|---|
| macOS, Linux o Windows | — |
| [Bun](https://bun.sh) ≥ 1.1 | `bun --version` |
| Git | `git --version` |
| **Figma Desktop** (recomendado) o Figma Web | Los plugins de desarrollo solo se importan desde la app de escritorio |
| Un cliente MCP (p. ej. Claude Code) | `claude --version` |

Instalar Bun si no lo tienes:

```bash
curl -fsSL https://bun.sh/install | bash
```

---

## 1.1 Instalación asistida por agente (opcional)

Si prefieres que lo instale tu agente, pega este prompt en él (Claude Code, Codex, Cursor…). El agente se encarga de los pasos de terminal. Los pasos dentro de Figma (importar el manifest y lanzar el plugin) solo los puede hacer él si tiene **control del escritorio (computer use)**:

- **Codex desktop app**: tiene computer use, pero solo en macOS y, de momento, **no está disponible en la UE ni en el Reino Unido**.
- **Claude Desktop**: tiene computer use si lo activas en la app.
- Si tu agente no puede controlar el escritorio, te pedirá que hagas tú esos dos pasos (menos de un minuto) y luego seguirá.

```text
Install and configure the Figma Live Bridge MCP (https://github.com/marioccarloss/figma-live-mcp) on this machine. Follow docs/INSTALL.md in that repo as the source of truth. Work step by step and verify each step before continuing.

1. Preflight: check git, bun (>= 1.1) and which MCP clients are installed (claude, codex, cursor, Claude Desktop). If bun is missing, ask me before installing it with `curl -fsSL https://bun.sh/install | bash`.
2. Ask me where to clone (default: ~/Projects/figma-live-mcp). Clone, then run `bun install`, `bun run build`, `bun run compile`. Verify that packages/figma-plugin/dist/code.js, packages/figma-plugin/dist/ui.html and dist/figma-live-mcp exist. Print the absolute binary path.
3. Register the MCP server as "figma-live" (stdio, command = absolute binary path, no args) in the client I use. Claude Code: `claude mcp add figma-live --scope user <binary>`. Claude Desktop / Codex / Cursor: edit their MCP config file; back it up first and keep the existing servers.
4. Check port 4567 with `lsof -iTCP:4567 -sTCP:LISTEN`. If another process holds it, tell me its PID and command; do not kill it without my approval.
5. Figma GUI steps. If you can control the desktop (computer use): open Figma Desktop, open any design file, go to Menu → Plugins → Development → Import plugin from manifest…, select <repo>/packages/figma-plugin/manifest.json, then run Plugins → Development → Figma Live Bridge. Do not edit, move or delete anything in my Figma files. If you cannot control the desktop, give me these exact steps with the manifest path and wait until I confirm.
6. Tell me to restart the agent session so it loads the new MCP server. After the restart, call `figma_status` and confirm the plugin is connected.
7. Finish with a short summary: install path, binary path, config file changed, and a sample prompt to try (e.g. "Inspect the frame I have selected in Figma").
If any step fails, stop, show the error and use the troubleshooting table in docs/INSTALL.md before retrying.
```

---

## 2. Descargar y compilar

```bash
git clone https://github.com/marioccarloss/figma-live-mcp.git
cd figma-live-mcp
bun install
bun run build      # compila el plugin de Figma -> packages/figma-plugin/dist/
bun run compile    # genera el binario del servidor -> dist/figma-live-mcp
```

Comprueba que existen estos tres archivos:

```bash
ls packages/figma-plugin/dist/code.js packages/figma-plugin/dist/ui.html dist/figma-live-mcp
```

> La carpeta `dist/` no está en el repo: hay que compilar siempre en tu máquina (el binario depende de tu sistema y arquitectura).

Guarda la ruta absoluta del binario, la necesitas en el paso 4:

```bash
echo "$(pwd)/dist/figma-live-mcp"
```

---

## 3. Instalar el plugin en Figma

1. Abre **Figma Desktop** y cualquier archivo de diseño.
2. Menú **Figma (☰)** → **Plugins** → **Development** → **Import plugin from manifest…**
3. Selecciona `figma-live-mcp/packages/figma-plugin/manifest.json`.
4. Lanza el plugin: **Plugins** → **Development** → **Figma Live Bridge**.

Se abre una ventanita con un indicador de estado. Mientras el servidor MCP no esté corriendo aparecerá como desconectado; es normal: reintenta solo cada 2 segundos.

> El plugin tiene que estar **abierto** en el archivo de Figma que quieras inspeccionar. Si cierras el plugin o cambias de archivo, vuelve a lanzarlo.

---

## 4. Configurar tu agente de IA

Sustituye `/RUTA/A/figma-live-mcp` por la ruta que obtuviste en el paso 2.

### Claude Code

```bash
claude mcp add figma-live --scope user /RUTA/A/figma-live-mcp/dist/figma-live-mcp
claude mcp list   # debe aparecer figma-live como ✓ Connected
```

### Claude Desktop

Edita `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) o `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "figma-live": {
      "command": "/RUTA/A/figma-live-mcp/dist/figma-live-mcp"
    }
  }
}
```

Reinicia Claude Desktop.

### Cursor / OpenCode / Codex / otros

Cualquier cliente MCP vale: es un servidor **stdio** cuyo comando es la ruta al binario, sin argumentos. Alternativa sin compilar el binario:

```json
{ "command": "bun", "args": ["run", "/RUTA/A/figma-live-mcp/packages/mcp-server/src/index.ts"] }
```

---

## 5. Comprobar que todo funciona

1. Figma abierto con el plugin **Figma Live Bridge** lanzado.
2. Abre tu agente en la carpeta de tu proyecto.
3. Pídele: *"Comprueba el estado de figma-live"* → usa `figma_status` y debe responder que el plugin está conectado.
4. El indicador del plugin en Figma pasa a conectado.

---

## 6. Uso diario

### Qué arranca solo y qué no

| Pieza | ¿Arranca sola? | Detalle |
|---|---|---|
| Servidor MCP (`figma-live-mcp`) | **Sí** | Lo lanza tu agente al abrir sesión, porque está en su config MCP. Abre `ws://localhost:4567` y se cierra al cerrar la sesión. |
| Plugin de Figma | **No** | Figma no ejecuta plugins automáticamente al abrir un archivo. Lánzalo en cada archivo: **⌥⌘P** (*Run last plugin*, `Ctrl+Alt+P` en Windows) o **Plugins → Development → Figma Live Bridge**. |

El orden da igual: el plugin reintenta la conexión cada 2 segundos, así que si lo abres antes que el agente se conecta solo cuando el servidor arranca.

Rutina diaria:

1. Abre el archivo de Figma y pulsa **⌥⌘P**.
2. Abre tu agente en la carpeta del proyecto.
3. Selecciona algo en Figma (o copia un "Copy link to selection") y pide lo que necesites.

> Solo puede haber **una** sesión del agente con este MCP a la vez (el puerto 4567 es único). Una segunda sesión fallará al arrancar el MCP con `Connection closed`.

### Herramientas disponibles

| Herramienta | Qué hace |
|---|---|
| `figma_status` | Indica si el plugin está conectado al servidor. |
| `figma_get_selected` | Inspecciona lo que tengas **seleccionado** en Figma: layout (auto-layout, padding, gap), colores, tipografía, bordes, sombras. Opcionalmente exporta assets. |
| `figma_find_node` | Busca un frame/capa por **nombre** (`"Navbar"`), por **URL** de Figma o por **node-id** (`123:456`), lo selecciona y centra en el canvas y extrae sus tokens. |
| `figma_inspect_url` | Inspecciona directamente un enlace de **"Copy link to selection"** (`...?node-id=12-34`). |

Parámetros comunes:

- `export_assets` (`true`/`false`): exporta iconos vectoriales como `.svg` e imágenes como `.png`.
- `assets_dir` (por defecto `src/assets`): carpeta, **relativa al directorio donde arrancó el agente**, donde se guardan los assets.

### Flujos recomendados

**Desde la selección**
1. Selecciona el componente o frame en Figma.
2. Pide: *"Crea el componente React del botón que tengo seleccionado en Figma"*.

**Desde un enlace (lo más preciso)**
1. En Figma: clic derecho sobre el frame → **Copy/Paste as** → **Copy link to selection**.
2. Pide: *"Inspecciona este nodo de Figma y maqueta el componente: https://www.figma.com/design/…?node-id=12-34"*.

**Exportar iconos**
- *"Inspecciona el frame 'Navbar', exporta sus iconos a `src/assets/icons` y genera el componente"*.

**Comparar con tu código**
- *"Revisa los colores del diseño seleccionado y compáralos con las variables de `theme.css`"*.

> El archivo de Figma que se inspecciona es el que tiene el plugin abierto. Una URL de otro archivo no lo abre: primero abre ese archivo y lanza ahí el plugin.

---

## 7. Solución de problemas

| Síntoma | Causa probable | Solución |
|---|---|---|
| El plugin aparece desconectado | El servidor MCP no está corriendo | Abre/reinicia tu agente (es quien arranca el servidor) y vuelve a lanzar el plugin. |
| El agente dice `Connection closed` o el MCP falla al arrancar | **Otro proceso ya ocupa el puerto 4567** (p. ej. otra sesión del agente abierta) | Solo puede haber **un** servidor a la vez. Mira quién lo usa: `lsof -iTCP:4567 -sTCP:LISTEN` y cierra esa sesión o `kill <PID>`. |
| `figma_status` dice no conectado aunque el plugin esté abierto | El plugin reintenta cada 2 s; si sigue desconectado, el servidor no está escuchando en 4567 | Comprueba `lsof -iTCP:4567 -sTCP:LISTEN`. Si no hay nada, reinicia el agente. Si hay otro proceso, ver la fila de `Connection closed`. |
| No encuentra un nodo por nombre | El nombre no coincide o está en otra página/archivo | Usa la URL de "Copy link to selection". |
| Los assets aparecen en otra carpeta | `assets_dir` es relativo al directorio del agente | Arranca el agente en la raíz del proyecto o pasa una ruta concreta. |
| `Import plugin from manifest` no aparece | Estás en Figma Web | Usa Figma Desktop. |
| macOS bloquea el binario | Gatekeeper | Como lo compilaste tú no debería pasar; si pasa: `xattr -d com.apple.quarantine dist/figma-live-mcp`. |

### Cambiar el puerto

El servidor acepta `FIGMA_BRIDGE_PORT`, pero el plugin tiene el puerto **4567** fijo (`ui.html` y `manifest.json`). Si lo cambias, cámbialo en los tres sitios y recompila con `bun run build`.

---

## 8. Actualizar

```bash
cd figma-live-mcp
git pull
bun install
bun run build && bun run compile
```

Reinicia el agente y vuelve a lanzar el plugin en Figma (no hace falta reimportar el manifest).
