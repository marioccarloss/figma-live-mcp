import type { ServerWebSocket } from "bun";
import type { InspectRequest, InspectResponse } from "../../shared/src/types";

interface ClientData {
  id: string;
}

interface PendingPromise {
  resolve: (value: InspectResponse) => void;
  reject: (reason?: any) => void;
  timer: any;
}

class FigmaBridgeWebSocketServer {
  private server: any = null;
  private activeClients = new Set<ServerWebSocket<ClientData>>();
  private pendingRequests = new Map<string, PendingPromise>();
  private port: number;

  constructor(port = 4567) {
    this.port = port;
  }

  public start() {
    if (this.server) return;

    const self = this;
    this.server = Bun.serve<ClientData>({
      port: this.port,
      async fetch(req, server) {
        if (req.method === "OPTIONS") {
          return new Response(null, {
            status: 204,
            headers: {
              "Access-Control-Allow-Origin": req.headers.get("Origin") || "*",
              "Access-Control-Allow-Private-Network": "true",
              "Access-Control-Allow-Headers": "*",
              "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            },
          });
        }
        const url = new URL(req.url);
        if (url.pathname === "/inspect") {
          try {
            const data = await self.sendRequest({
              id: crypto.randomUUID(),
              type: "INSPECT_SELECTION",
              exportAssets: false,
            });
            return Response.json(data, {
              headers: {
                "Access-Control-Allow-Origin": "*",
              },
            });
          } catch (err: any) {
            return Response.json(
              { success: false, error: err?.message || String(err) },
              {
                status: 500,
                headers: { "Access-Control-Allow-Origin": "*" },
              }
            );
          }
        }
        if (url.pathname === "/find") {
          const name = url.searchParams.get("name") || "";
          try {
            const data = await self.sendRequest({
              id: crypto.randomUUID(),
              type: "INSPECT_NODE_BY_NAME",
              name,
              exportAssets: false,
            });
            return Response.json(data, {
              headers: { "Access-Control-Allow-Origin": "*", },
            });
          } catch (err: any) {
            return Response.json(
              { success: false, error: err?.message || String(err) },
              {
                status: 500,
                headers: { "Access-Control-Allow-Origin": "*" },
              }
            );
          }
        }
        if (url.pathname === "/status") {
          return Response.json(
            {
              connected: self.isConnected(),
              activeClients: self.getClientCount(),
            },
            {
              headers: { "Access-Control-Allow-Origin": "*" },
            }
          );
        }
        const success = server.upgrade(req, {
          data: { id: crypto.randomUUID() },
        });
        if (success) return undefined;
        return new Response("Figma Live Bridge WebSocket Server Running", {
          status: 200,
          headers: {
            "Access-Control-Allow-Origin": req.headers.get("Origin") || "*",
            "Access-Control-Allow-Private-Network": "true",
          },
        });
      },
      websocket: {
        open: (ws) => {
          this.activeClients.add(ws);
          console.error(`[Figma Live Bridge] Figma plugin connected (Total: ${this.activeClients.size})`);
        },
        message: (ws, message) => {
          try {
            const parsed = JSON.parse(String(message));
            
            // If it's a response to a pending request
            if (parsed.id && this.pendingRequests.has(parsed.id)) {
              const pending = this.pendingRequests.get(parsed.id)!;
              clearTimeout(pending.timer);
              this.pendingRequests.delete(parsed.id);
              pending.resolve(parsed as InspectResponse);
            }
          } catch (err) {
            console.error("[Figma Live Bridge] Error parsing message from Figma plugin:", err);
          }
        },
        close: (ws) => {
          this.activeClients.delete(ws);
          console.error(`[Figma Live Bridge] Figma plugin disconnected (Remaining: ${this.activeClients.size})`);
        },
      },
    });

    console.error(`[Figma Live Bridge] WebSocket server listening on ws://127.0.0.1:${this.port}`);
  }

  public isConnected(): boolean {
    return this.activeClients.size > 0;
  }

  public getClientCount(): number {
    return this.activeClients.size;
  }

  public async sendRequest(req: InspectRequest, timeoutMs = 15000): Promise<InspectResponse> {
    if (this.activeClients.size === 0) {
      throw new Error(
        "Figma plugin is not connected. Please open Figma and run the 'Figma Live Bridge' plugin."
      );
    }

    // Get the first active client (Figma session)
    const client = this.activeClients.values().next().value;
    if (!client) {
      throw new Error("No active Figma plugin connection available.");
    }

    return new Promise<InspectResponse>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(req.id);
        reject(new Error(`Timed out waiting for Figma response after ${timeoutMs / 1000}s.`));
      }, timeoutMs);

      this.pendingRequests.set(req.id, { resolve, reject, timer });

      client.send(JSON.stringify(req));
    });
  }

  public stop() {
    if (this.server) {
      this.server.stop();
      this.server = null;
    }
  }
}

export const bridgeWs = new FigmaBridgeWebSocketServer(Number(process.env.FIGMA_BRIDGE_PORT || 4567));
