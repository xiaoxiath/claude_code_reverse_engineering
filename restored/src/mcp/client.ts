/**
 * MCP (Model Context Protocol) Client — Transport, Connection, and Tool Integration
 *
 * Reverse-engineered from claude_code_agent.js v2.1.83
 * Build: 2026-03-25T05:15:24Z
 *
 * Obfuscated name mapping:
 *   vX7      → initializeMcpClients (MCP client lifecycle init, pos ~1834804 owO)
 *   sp9      → shutdownMcpClients (MCP client lifecycle shutdown, pos ~1834804 owO)
 *   fg9      → McpServerHandler (MCP server handler class, pos 1880000)
 *   qYO      → McpServerHandler alias (pos 1880000)
 *   go_      → filterMcpTools (filter MCP tools by permission context, pos 1833077)
 *   rP       → resolveMcpTool (tool resolution in MCP handler chain)
 *   tJ       → transformMcpTool (tool transformation in MCP handler)
 *   RK       → findToolByName (find tool in tools array by name)
 *   ip9      → createCanUseToolWithPermissionPrompt (MCP permission wrapper)
 *   Hg9      → ServerSelector (TUI server selector component)
 *   ZT       → globalState singleton (invokedSkills, inlinePlugins fields)
 *
 * Source confidence:
 *   [CONFIRMED] — Directly extracted from minified code
 *   [INFERRED]  — Reconstructed from call sites and data flow
 *   [SPECULATIVE] — Reasonable guess based on patterns
 */

// ============================================================================
// MCP Transport Types [CONFIRMED/INFERRED]
// ============================================================================

/**
 * Transport types supported by the MCP client.
 *
 * [CONFIRMED] — stdio transport confirmed from "stdio" string at np9 function
 * [CONFIRMED] — SSE transport confirmed from SSE parsing infrastructure
 * [INFERRED] — streamable-http based on MCP spec 2025-03-26
 */
export type McpTransportType = 'stdio' | 'sse' | 'streamable-http';

/**
 * Base transport configuration.
 * [INFERRED] — from MCP server configuration schema
 */
export interface McpTransportConfig {
  type: McpTransportType;
  /** Connection timeout in ms */
  timeout?: number;
}

/**
 * stdio transport — communicates with MCP server via stdin/stdout.
 *
 * [CONFIRMED] — stdio is the primary local transport
 * The server is spawned as a child process; JSON-RPC messages are
 * exchanged over stdin/stdout, with stderr used for logging.
 */
export interface StdioTransportConfig extends McpTransportConfig {
  type: 'stdio';
  /** Command to spawn the MCP server */
  command: string;
  /** Arguments for the command */
  args?: string[];
  /** Environment variables for the child process */
  env?: Record<string, string>;
  /** Working directory for the child process */
  cwd?: string;
}

/**
 * SSE transport — connects to MCP server via Server-Sent Events.
 *
 * [CONFIRMED] — SSE parsing exists in the bundle (event: data: patterns)
 * Used for remote MCP servers (e.g., mcp-proxy.anthropic.com).
 */
export interface SseTransportConfig extends McpTransportConfig {
  type: 'sse';
  /** SSE endpoint URL */
  url: string;
  /** HTTP headers for the connection */
  headers?: Record<string, string>;
}

/**
 * Streamable HTTP transport — MCP 2025-03-26 spec addition.
 *
 * [INFERRED] — based on MCP protocol specification
 * Bidirectional HTTP streaming without long-lived SSE connections.
 */
export interface StreamableHttpTransportConfig extends McpTransportConfig {
  type: 'streamable-http';
  /** HTTP endpoint URL */
  url: string;
  /** HTTP headers for requests */
  headers?: Record<string, string>;
}

export type TransportConfig =
  | StdioTransportConfig
  | SseTransportConfig
  | StreamableHttpTransportConfig;

// ============================================================================
// MCP Server Configuration [CONFIRMED]
// ============================================================================

/**
 * MCP server definition as found in settings.
 *
 * [CONFIRMED] — from MCP server configuration validation schema
 */
export interface McpServerConfig {
  /** Human-readable name */
  name: string;
  /** Transport configuration */
  transport: TransportConfig;
  /** Whether the server is enabled (default: true) */
  enabled?: boolean;
  /** Scopes where this server is available */
  scope?: 'project' | 'global';
}

// ============================================================================
// MCP Tool Types [CONFIRMED]
// ============================================================================

/**
 * Tool definition as received from an MCP server.
 *
 * [CONFIRMED] — from MCP handler tool dispatch (pos 1880934)
 * [CONFIRMED] — MCP tools follow the same Tool interface as built-in tools
 */
export interface McpToolDefinition {
  /** Tool name (prefixed with server name in some modes) */
  name: string;
  /** Tool description */
  description: string;
  /** JSON Schema for input parameters */
  inputSchema: Record<string, unknown>;
  /** Whether the tool is read-only */
  isReadOnly?: boolean;
}

/**
 * MCP tool wrapped for use in the Claude Code tool pipeline.
 *
 * [CONFIRMED] — MCP tools are merged into the main tools array
 * [CONFIRMED] — from tool merging at pos 1833077:
 *   `let k = go_(z.mcp.tools, z.toolPermissionContext);`
 *   `let X = [...$, ...k];`
 */
export interface McpTool {
  /** Fully qualified tool name */
  name: string;
  /** Server name this tool belongs to */
  serverName: string;
  /** Original tool definition from the server */
  definition: McpToolDefinition;
  /** Call the tool via the MCP client */
  call(input: Record<string, unknown>): Promise<McpToolResult>;
  /** Tool prompt/description for the LLM */
  prompt(): string;
  /** Input schema for validation */
  inputSchema: Record<string, unknown>;
  /** Whether this tool modifies state */
  isReadOnly(input?: Record<string, unknown>): boolean;
  /** Whether the tool is currently available */
  isEnabled(): boolean;
}

/**
 * Result from calling an MCP tool.
 * [CONFIRMED] — from MCP handler result construction
 */
export interface McpToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
}

// ============================================================================
// JSON-RPC Types [CONFIRMED]
// ============================================================================

/**
 * JSON-RPC 2.0 message types used by MCP.
 * [CONFIRMED] — MCP uses JSON-RPC 2.0 protocol
 */
export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number | string;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

export interface JsonRpcNotification {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
}

export type JsonRpcMessage = JsonRpcRequest | JsonRpcResponse | JsonRpcNotification;

// ============================================================================
// MCP Client Implementation [CONFIRMED/INFERRED]
// ============================================================================

/**
 * MCP output token limit.
 * [CONFIRMED] — MAX_MCP_OUTPUT_TOKENS = 25000 (overridable via env)
 */
const MAX_MCP_OUTPUT_TOKENS = parseInt(
  process.env.CLAUDE_CODE_MAX_MCP_OUTPUT_TOKENS ?? '25000',
  10,
);

/**
 * Pre-check threshold: 50% of max for fast pass-through.
 * [INFERRED] — `25000 * 0.5 = 12500`
 */
const MCP_OUTPUT_PRECHECK_THRESHOLD = MAX_MCP_OUTPUT_TOKENS * 0.5;

/**
 * Character truncation limit: tokens * 4.
 * [INFERRED] — `25000 * 4 = 100000`
 */
const MCP_OUTPUT_CHAR_LIMIT = MAX_MCP_OUTPUT_TOKENS * 4;

/**
 * MCP Client — manages a connection to a single MCP server.
 *
 * Handles transport lifecycle (spawn/connect/disconnect), JSON-RPC
 * messaging, tool discovery, and tool invocation.
 *
 * [CONFIRMED] — MCP client lifecycle managed by vX7()/sp9() in owO()
 * [INFERRED] — class structure reconstructed from usage patterns
 *
 * Key integration points:
 * - vX7() initializes all MCP clients at session start
 * - sp9() shuts down all MCP clients at session end
 * - fg9/qYO (pos 1880000) handles MCP server-side protocol
 * - go_() (pos 1833077) filters MCP tools by permission context
 */
export class McpClient {
  /** Server configuration */
  readonly config: McpServerConfig;

  /** Current connection state */
  private state: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected';

  /** Child process handle (for stdio transport) */
  private childProcess: any = null;

  /** Pending JSON-RPC requests awaiting responses */
  private pendingRequests: Map<
    number | string,
    { resolve: (value: unknown) => void; reject: (error: Error) => void; timer: NodeJS.Timeout }
  > = new Map();

  /** Incrementing request ID counter */
  private nextRequestId = 1;

  /** Tools discovered from this server */
  private discoveredTools: McpToolDefinition[] = [];

  /** Server capabilities (from initialize response) */
  private serverCapabilities: Record<string, unknown> = {};

  /** Receive buffer for stdio (accumulates partial JSON-RPC messages) */
  private receiveBuffer = '';

  /** Event/notification handlers */
  private notificationHandlers: Map<string, Array<(params: any) => void>> = new Map();

  /** AbortController for connection lifecycle */
  private abortController: AbortController = new AbortController();

  constructor(config: McpServerConfig) {
    this.config = config;
  }

  // --------------------------------------------------------------------------
  // Connection Lifecycle [CONFIRMED]
  // --------------------------------------------------------------------------

  /**
   * Connects to the MCP server.
   * Obfuscated: part of vX7() initialization flow
   *
   * [CONFIRMED] — MCP clients are initialized at session start in owO()
   *
   * Flow:
   * 1. Establish transport (spawn process / open SSE / open HTTP)
   * 2. Send `initialize` JSON-RPC request
   * 3. Receive server capabilities
   * 4. Send `notifications/initialized` notification
   * 5. Discover tools via `tools/list`
   */
  async connect(): Promise<void> {
    if (this.state === 'connected') return;
    this.state = 'connecting';
    this.abortController = new AbortController();

    try {
      switch (this.config.transport.type) {
        case 'stdio':
          await this.connectStdio(this.config.transport as StdioTransportConfig);
          break;
        case 'sse':
          await this.connectSse(this.config.transport as SseTransportConfig);
          break;
        case 'streamable-http':
          await this.connectStreamableHttp(
            this.config.transport as StreamableHttpTransportConfig,
          );
          break;
        default:
          throw new Error(`Unsupported transport type: ${(this.config.transport as any).type}`);
      }

      // [CONFIRMED] MCP protocol handshake: initialize → initialized → tools/list
      await this.performHandshake();
      await this.discoverTools();

      this.state = 'connected';
    } catch (error) {
      this.state = 'error';
      throw error;
    }
  }

  /**
   * Disconnects from the MCP server.
   * Obfuscated: part of sp9() shutdown flow
   *
   * [CONFIRMED] — MCP clients are shut down at session end in owO()
   */
  async disconnect(): Promise<void> {
    this.abortController.abort();

    // Cancel all pending requests
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timer);
      pending.reject(new Error('MCP client disconnecting'));
    }
    this.pendingRequests.clear();

    // Kill child process for stdio transport
    if (this.childProcess) {
      try {
        this.childProcess.kill('SIGTERM');
        // Give it 5 seconds to exit gracefully
        await new Promise<void>((resolve) => {
          const timer = setTimeout(() => {
            try {
              this.childProcess?.kill('SIGKILL');
            } catch {}
            resolve();
          }, 5000);
          this.childProcess?.on?.('exit', () => {
            clearTimeout(timer);
            resolve();
          });
        });
      } catch {}
      this.childProcess = null;
    }

    this.state = 'disconnected';
    this.receiveBuffer = '';
  }

  // --------------------------------------------------------------------------
  // Transport Implementations [CONFIRMED/INFERRED]
  // --------------------------------------------------------------------------

  /**
   * Connects via stdio transport (child process).
   *
   * [CONFIRMED] — stdio is the primary transport for local MCP servers
   * [INFERRED] — uses child_process.spawn similar to C8 shell execution
   */
  private async connectStdio(config: StdioTransportConfig): Promise<void> {
    const { spawn } = await import('child_process');

    const env = {
      ...process.env,
      ...(config.env ?? {}),
    };

    this.childProcess = spawn(config.command, config.args ?? [], {
      env,
      cwd: config.cwd ?? process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'], // stdin, stdout, stderr
    });

    // [CONFIRMED] stdout carries JSON-RPC responses
    this.childProcess.stdout.on('data', (data: Buffer) => {
      this.handleStdioData(data.toString('utf-8'));
    });

    // [INFERRED] stderr is logged but not parsed
    this.childProcess.stderr.on('data', (data: Buffer) => {
      // MCP server stderr goes to debug logging
    });

    this.childProcess.on('error', (error: Error) => {
      this.state = 'error';
    });

    this.childProcess.on('exit', (code: number | null) => {
      if (this.state === 'connected') {
        this.state = 'disconnected';
      }
    });
  }

  /**
   * Connects via SSE transport (Server-Sent Events).
   *
   * [CONFIRMED] — SSE parsing infrastructure exists in the bundle
   * [INFERRED] — follows standard MCP SSE transport pattern
   */
  private async connectSse(config: SseTransportConfig): Promise<void> {
    // [CONFIRMED] Uses fetch (Bun native) for SSE connection
    // The SSE endpoint provides a message endpoint URL for sending requests
    const response = await fetch(config.url, {
      headers: {
        Accept: 'text/event-stream',
        ...(config.headers ?? {}),
      },
      signal: this.abortController.signal,
    });

    if (!response.ok) {
      throw new Error(`SSE connection failed: ${response.status} ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('SSE response has no body');
    }

    // [CONFIRMED] SSE parsing: event: and data: lines
    this.parseSseStream(response.body);
  }

  /**
   * Connects via streamable HTTP transport.
   *
   * [INFERRED] — based on MCP 2025-03-26 specification
   * Bidirectional HTTP streaming, each request/response is a separate HTTP request.
   */
  private async connectStreamableHttp(config: StreamableHttpTransportConfig): Promise<void> {
    // Streamable HTTP doesn't maintain a persistent connection for receiving.
    // Requests are sent via POST and responses come back in the same HTTP response.
    // Notifications are received via a separate GET with SSE.
    //
    // [SPECULATIVE] — exact implementation details behind M() closure
  }

  // --------------------------------------------------------------------------
  // JSON-RPC Messaging [CONFIRMED]
  // --------------------------------------------------------------------------

  /**
   * Sends a JSON-RPC request and waits for a response.
   *
   * [CONFIRMED] — MCP uses JSON-RPC 2.0 protocol
   * [INFERRED] — request/response correlation via id field
   */
  async sendRequest(method: string, params?: Record<string, unknown>): Promise<unknown> {
    const id = this.nextRequestId++;
    const timeout = this.config.transport.timeout ?? 30000;

    const request: JsonRpcRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`MCP request timeout: ${method} (${timeout}ms)`));
      }, timeout);

      this.pendingRequests.set(id, { resolve, reject, timer });

      this.sendRawMessage(request);
    });
  }

  /**
   * Sends a JSON-RPC notification (no response expected).
   * [CONFIRMED] — MCP uses notifications for initialized, progress, etc.
   */
  sendNotification(method: string, params?: Record<string, unknown>): void {
    const notification: JsonRpcNotification = {
      jsonrpc: '2.0',
      method,
      params,
    };
    this.sendRawMessage(notification);
  }

  /**
   * Sends a raw JSON-RPC message over the active transport.
   * [INFERRED] — routes to the correct transport send method
   */
  private sendRawMessage(message: JsonRpcMessage): void {
    const json = JSON.stringify(message);

    switch (this.config.transport.type) {
      case 'stdio':
        if (this.childProcess?.stdin?.writable) {
          // [CONFIRMED] stdio uses newline-delimited JSON
          this.childProcess.stdin.write(json + '\n');
        }
        break;
      case 'sse':
      case 'streamable-http':
        // [INFERRED] POST to the message endpoint URL received during SSE connection
        this.sendHttpMessage(json);
        break;
    }
  }

  /**
   * Sends a message via HTTP POST for SSE/streamable-http transports.
   * [INFERRED]
   */
  private async sendHttpMessage(json: string): Promise<void> {
    // [SPECULATIVE] The message endpoint URL is provided by the SSE connection
    // or configured directly for streamable-http transport.
    const url =
      this.config.transport.type === 'streamable-http'
        ? (this.config.transport as StreamableHttpTransportConfig).url
        : (this.config.transport as SseTransportConfig).url;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const transportHeaders =
      'headers' in this.config.transport ? (this.config.transport as any).headers : undefined;
    if (transportHeaders) {
      Object.assign(headers, transportHeaders);
    }

    await fetch(url, {
      method: 'POST',
      headers,
      body: json,
      signal: this.abortController.signal,
    });
  }

  // --------------------------------------------------------------------------
  // Message Parsing [CONFIRMED]
  // --------------------------------------------------------------------------

  /**
   * Handles incoming data from stdio transport.
   * Accumulates partial messages and processes complete JSON-RPC messages.
   *
   * [CONFIRMED] — stdio uses newline-delimited JSON
   */
  private handleStdioData(data: string): void {
    this.receiveBuffer += data;

    // Process complete lines
    let newlineIdx: number;
    while ((newlineIdx = this.receiveBuffer.indexOf('\n')) >= 0) {
      const line = this.receiveBuffer.substring(0, newlineIdx).trim();
      this.receiveBuffer = this.receiveBuffer.substring(newlineIdx + 1);

      if (line.length === 0) continue;

      try {
        const message = JSON.parse(line) as JsonRpcMessage;
        this.handleMessage(message);
      } catch {
        // Malformed JSON — skip line
      }
    }
  }

  /**
   * Parses an SSE stream from a ReadableStream.
   *
   * [CONFIRMED] — SSE parsing: event: and data: line patterns
   */
  private async parseSseStream(body: ReadableStream<Uint8Array>): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete SSE events
        const events = buffer.split('\n\n');
        buffer = events.pop() ?? ''; // Keep incomplete event

        for (const event of events) {
          let eventType = 'message';
          let data = '';

          for (const line of event.split('\n')) {
            if (line.startsWith('event: ')) {
              eventType = line.substring(7).trim();
            } else if (line.startsWith('data: ')) {
              data += line.substring(6);
            }
          }

          if (data && eventType === 'message') {
            try {
              const message = JSON.parse(data) as JsonRpcMessage;
              this.handleMessage(message);
            } catch {
              // Malformed JSON in SSE data
            }
          }
        }
      }
    } catch (error) {
      if (!this.abortController.signal.aborted) {
        this.state = 'error';
      }
    }
  }

  /**
   * Handles a parsed JSON-RPC message.
   * [CONFIRMED] — routes responses to pending requests, notifications to handlers
   */
  private handleMessage(message: JsonRpcMessage): void {
    // Response (has id and result/error)
    if ('id' in message && ('result' in message || 'error' in message)) {
      const response = message as JsonRpcResponse;
      const pending = this.pendingRequests.get(response.id);
      if (pending) {
        clearTimeout(pending.timer);
        this.pendingRequests.delete(response.id);
        if (response.error) {
          pending.reject(
            new Error(`MCP error ${response.error.code}: ${response.error.message}`),
          );
        } else {
          pending.resolve(response.result);
        }
      }
      return;
    }

    // Notification (has method but no id)
    if ('method' in message && !('id' in message)) {
      const notification = message as JsonRpcNotification;
      const handlers = this.notificationHandlers.get(notification.method);
      if (handlers) {
        for (const handler of handlers) {
          try {
            handler(notification.params);
          } catch {}
        }
      }
      return;
    }

    // Request from server (has method and id) — server-initiated requests
    if ('method' in message && 'id' in message) {
      // [INFERRED] Server-initiated requests (e.g., sampling, roots)
      // Respond with not-supported for unhandled methods
      const request = message as JsonRpcRequest;
      this.sendRawMessage({
        jsonrpc: '2.0',
        id: request.id,
        error: { code: -32601, message: `Method not found: ${request.method}` },
      });
    }
  }

  // --------------------------------------------------------------------------
  // MCP Protocol Operations [CONFIRMED]
  // --------------------------------------------------------------------------

  /**
   * Performs the MCP protocol handshake.
   *
   * [CONFIRMED] — MCP handshake: initialize → initialized notification
   */
  private async performHandshake(): Promise<void> {
    // [CONFIRMED] Send initialize with client capabilities
    const result = (await this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {
        roots: { listChanged: true },
      },
      clientInfo: {
        name: 'claude-code',
        version: '2.1.83',
      },
    })) as { capabilities?: Record<string, unknown>; serverInfo?: Record<string, unknown> };

    this.serverCapabilities = result.capabilities ?? {};

    // [CONFIRMED] Send initialized notification
    this.sendNotification('notifications/initialized');
  }

  /**
   * Discovers available tools from the MCP server.
   *
   * [CONFIRMED] — tools/list is called during initialization
   */
  private async discoverTools(): Promise<void> {
    const result = (await this.sendRequest('tools/list')) as {
      tools: McpToolDefinition[];
    };

    this.discoveredTools = result.tools ?? [];
  }

  /**
   * Calls a tool on the MCP server.
   *
   * [CONFIRMED] — from MCP handler tool dispatch at pos 1880934
   * Call chain: rP() → tJ() → RK(tools, name) → tool.call()
   */
  async callTool(name: string, input: Record<string, unknown>): Promise<McpToolResult> {
    const result = (await this.sendRequest('tools/call', {
      name,
      arguments: input,
    })) as McpToolResult;

    return result;
  }

  // --------------------------------------------------------------------------
  // Tool Access [CONFIRMED]
  // --------------------------------------------------------------------------

  /**
   * Returns the list of discovered tools.
   * [CONFIRMED] — MCP tools are merged into the main tools array
   */
  getTools(): McpToolDefinition[] {
    return this.discoveredTools;
  }

  /**
   * Wraps discovered tools as McpTool objects for the tool pipeline.
   *
   * [CONFIRMED] — MCP tools follow the same Tool interface as built-in tools
   * [INFERRED] — wrapping logic reconstructed from tool merging at pos 1833077
   */
  wrapToolsForPipeline(): McpTool[] {
    return this.discoveredTools.map((def) => ({
      name: def.name,
      serverName: this.config.name,
      definition: def,
      call: (input: Record<string, unknown>) => this.callTool(def.name, input),
      prompt: () => def.description,
      inputSchema: def.inputSchema,
      isReadOnly: () => def.isReadOnly ?? false,
      isEnabled: () => this.state === 'connected',
    }));
  }

  /**
   * Returns the current connection state.
   * [INFERRED]
   */
  getState(): 'disconnected' | 'connecting' | 'connected' | 'error' {
    return this.state;
  }

  /**
   * Registers a notification handler.
   * [INFERRED] — for server-sent notifications like tool list changes
   */
  onNotification(method: string, handler: (params: any) => void): void {
    const existing = this.notificationHandlers.get(method) ?? [];
    existing.push(handler);
    this.notificationHandlers.set(method, existing);
  }
}

// ============================================================================
// MCP Tool Filtering [CONFIRMED, pos 1833077]
// ============================================================================

/**
 * Permission context for MCP tool filtering.
 * [CONFIRMED] — from QB() permission context builder
 */
export interface ToolPermissionContext {
  mode: string;
  allowRules: string[];
  denyRules: string[];
}

/**
 * Filters MCP tools by permission context.
 * Obfuscated: go_() (pos 1833077)
 *
 * [CONFIRMED] — from tool merging code:
 *   `let k = go_(z.mcp.tools, z.toolPermissionContext);`
 *
 * MCP tools are filtered based on:
 * 1. Server enabled status
 * 2. Permission mode (plan mode may exclude destructive tools)
 * 3. Allow/deny rules
 */
export function filterMcpTools(
  mcpTools: McpTool[],
  permissionContext: ToolPermissionContext,
): McpTool[] {
  return mcpTools.filter((tool) => {
    // [INFERRED] Check if tool's server is still connected
    if (!tool.isEnabled()) return false;

    // [INFERRED] In plan mode, only read-only MCP tools are available
    if (permissionContext.mode === 'plan' && !tool.isReadOnly()) {
      return false;
    }

    // [INFERRED] Check deny rules
    for (const rule of permissionContext.denyRules) {
      if (matchMcpToolRule(rule, tool.name)) return false;
    }

    return true;
  });
}

/**
 * Matches a permission rule against an MCP tool name.
 * [INFERRED] — similar pattern to built-in tool permission matching
 */
function matchMcpToolRule(rule: string, toolName: string): boolean {
  // Rules for MCP tools: "McpToolName" or "ServerName:ToolName" or wildcard "mcp:*"
  if (rule === toolName) return true;
  if (rule.endsWith('*')) {
    const prefix = rule.substring(0, rule.length - 1);
    return toolName.startsWith(prefix);
  }
  return false;
}

// ============================================================================
// MCP Output Truncation [CONFIRMED]
// ============================================================================

/**
 * Truncates MCP tool output to stay within token limits.
 *
 * [CONFIRMED] — MAX_MCP_OUTPUT_TOKENS = 25000 (env overridable)
 * [INFERRED] — pre-check threshold at 50%, char limit at tokens*4
 *
 * Flow:
 * 1. Quick check: if chars < precheck threshold * 4, pass through
 * 2. If chars > char limit, truncate at char limit with notice
 * 3. Otherwise pass through (between precheck and limit)
 */
export function truncateMcpOutput(output: string): string {
  const precheckCharLimit = MCP_OUTPUT_PRECHECK_THRESHOLD * 4;

  // [CONFIRMED] Fast path: small outputs pass through
  if (output.length <= precheckCharLimit) {
    return output;
  }

  // [CONFIRMED] Hard truncation at char limit
  if (output.length > MCP_OUTPUT_CHAR_LIMIT) {
    const truncated = output.substring(0, MCP_OUTPUT_CHAR_LIMIT);
    return (
      truncated +
      `\n\n[Output truncated: ${output.length} chars exceeded ${MCP_OUTPUT_CHAR_LIMIT} char limit (${MAX_MCP_OUTPUT_TOKENS} tokens)]`
    );
  }

  return output;
}

// ============================================================================
// MCP Client Lifecycle Functions [CONFIRMED]
// ============================================================================

/**
 * Initializes all MCP clients from server configurations.
 * Obfuscated: vX7() — called in owO() headless runner
 *
 * [CONFIRMED] — from owO() at pos 1834804:
 *   MCP client lifecycle managed with vX7() and sp9()
 */
export async function initializeMcpClients(
  serverConfigs: McpServerConfig[],
): Promise<McpClient[]> {
  const clients: McpClient[] = [];

  for (const config of serverConfigs) {
    if (config.enabled === false) continue;

    const client = new McpClient(config);
    try {
      await client.connect();
      clients.push(client);
    } catch (error) {
      // [INFERRED] Failed MCP connections are logged but don't block session start
      console.error(`Failed to connect to MCP server '${config.name}':`, error);
    }
  }

  return clients;
}

/**
 * Shuts down all MCP clients.
 * Obfuscated: sp9() — called in owO() headless runner cleanup
 *
 * [CONFIRMED] — from owO() at pos 1834804
 */
export async function shutdownMcpClients(clients: McpClient[]): Promise<void> {
  await Promise.allSettled(clients.map((c) => c.disconnect()));
}

/**
 * Collects all tools from connected MCP clients.
 * [INFERRED] — used during tool array construction
 */
export function collectMcpTools(clients: McpClient[]): McpTool[] {
  const tools: McpTool[] = [];
  for (const client of clients) {
    tools.push(...client.wrapToolsForPipeline());
  }
  return tools;
}
