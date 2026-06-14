// Minimal JSON-RPC 2.0 client for one language server, over the Tauri bridge.
// Handles request/response correlation, fire-and-forget notifications, the
// handful of server→client requests we must answer, and diagnostics dispatch.

import { lspSend, lspStop } from "@/lib/tauri";

interface Pending {
  resolve: (value: unknown) => void;
  reject: (error: unknown) => void;
}

type DiagnosticsHandler = (uri: string, diagnostics: unknown[]) => void;

interface RpcMessage {
  id?: number | string;
  method?: string;
  params?: unknown;
  result?: unknown;
  error?: unknown;
}

export class LspClient {
  readonly serverId: string;
  private nextId = 1;
  private readonly pending = new Map<number, Pending>();
  private onDiagnostics?: DiagnosticsHandler;

  constructor(serverId: string) {
    this.serverId = serverId;
  }

  setDiagnosticsHandler(handler: DiagnosticsHandler): void {
    this.onDiagnostics = handler;
  }

  /** Issue a request and await the server's response. */
  request<T = unknown>(method: string, params: unknown): Promise<T> {
    const id = this.nextId++;
    const body = JSON.stringify({ jsonrpc: "2.0", id, method, params });
    return new Promise<T>((resolve, reject) => {
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject });
      void lspSend(this.serverId, body).catch(reject);
    });
  }

  /** Send a notification (no response expected). */
  notify(method: string, params: unknown): void {
    void lspSend(this.serverId, JSON.stringify({ jsonrpc: "2.0", method, params }));
  }

  /** Feed a raw inbound message body (called by the manager's event router). */
  handleMessage(body: string): void {
    let msg: RpcMessage;
    try {
      msg = JSON.parse(body) as RpcMessage;
    } catch {
      return;
    }

    // Response to one of our requests.
    if (msg.id !== undefined && (msg.result !== undefined || msg.error !== undefined)) {
      const pending = this.pending.get(msg.id as number);
      if (pending) {
        this.pending.delete(msg.id as number);
        if (msg.error !== undefined) pending.reject(msg.error);
        else pending.resolve(msg.result);
      }
      return;
    }

    // Server → client request: must be answered or the server may stall.
    if (msg.method !== undefined && msg.id !== undefined) {
      this.answerServerRequest(msg);
      return;
    }

    // Notification.
    if (msg.method === "textDocument/publishDiagnostics") {
      const params = msg.params as { uri: string; diagnostics: unknown[] };
      this.onDiagnostics?.(params.uri, params.diagnostics ?? []);
    }
  }

  private answerServerRequest(msg: RpcMessage): void {
    // workspace/configuration expects one entry per requested item; everything
    // else we acknowledge with null (registerCapability, progress create, …).
    let result: unknown = null;
    if (msg.method === "workspace/configuration") {
      const items = (msg.params as { items?: unknown[] })?.items ?? [];
      result = items.map(() => null);
    }
    void lspSend(this.serverId, JSON.stringify({ jsonrpc: "2.0", id: msg.id, result }));
  }

  async shutdown(): Promise<void> {
    try {
      await this.request("shutdown", null);
      this.notify("exit", null);
    } catch {
      /* ignore */
    }
    await lspStop(this.serverId);
  }
}
