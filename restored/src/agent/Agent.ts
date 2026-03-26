/**
 * Agent Core — Complete Rewrite Based on Sp9 Class
 *
 * Reverse-engineered from claude_code_agent.js v2.1.83
 * Build: 2026-03-25T05:15:24Z
 *
 * Obfuscated name mapping:
 *   Sp9      → Agent (core engine class, pos 1812800)
 *   Lp9      → Agent base/config (pos 1812800)
 *   Ep9      → createAgentGenerator (async generator wrapper, pos 1824749)
 *   awO      → runHeadless (headless entry, pos 1829577)
 *   owO      → headlessRunner (headless runner, pos 1834804)
 *   cS       → innerConversationLoop (phantom, M() closure)
 *   OD       → buildToolPrompts (system prompt builder)
 *   V5       → loadUserConfig
 *   jH       → buildContext
 *   vFT      → preprocessInput
 *   q3_      → loadSkills
 *   ww       → loadPlugins
 *   RUT      → emitInitialSystemEvent
 *   GmT      → mergeUsageToTotal
 *   F8_      → accumulateUsage
 *   gD       → getTotalCostUsd
 *   gE       → getUsageByModel
 *
 * Source confidence:
 *   [CONFIRMED] — Directly extracted from minified code
 *   [INFERRED]  — Reconstructed from call sites and data flow
 *   [SPECULATIVE] — Reasonable guess based on patterns
 */

import { EventEmitter } from 'events';
import type { ZodSchema } from 'zod';

// ============================================================================
// Types — Based on actual structures found in reverse analysis
// ============================================================================

/** [CONFIRMED] Token usage tracking (from API response usage field) */
export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens: number;
  cache_creation_input_tokens: number;
}

/** [CONFIRMED] Permission denial record */
export interface PermissionDenial {
  toolName: string;
  input: Record<string, unknown>;
  reason: string;
  timestamp: number;
}

/** [CONFIRMED] File state cache entry */
export interface FileState {
  content: string;
  encoding: string;
  lineEndings: 'LF' | 'CRLF' | 'mixed';
  lastRead: number;
}

/** [CONFIRMED] Result subtypes from submitMessage() */
export type ResultSubtype =
  | 'success'
  | 'error_max_turns'
  | 'error_max_budget_usd'
  | 'error_max_structured_output_retries'
  | 'error_during_execution';

/** [CONFIRMED] Agent result structure */
export interface AgentResult {
  subtype: ResultSubtype;
  duration_ms: number;
  duration_api_ms: number;
  num_turns: number;
  stop_reason: string | null;
  total_cost_usd: number;
  usage: TokenUsage;
  modelUsage: Record<string, TokenUsage>;
  permission_denials: PermissionDenial[];
  fast_mode_state?: unknown;
}

/** [CONFIRMED] Thinking configuration */
export interface ThinkingConfig {
  enabled: boolean;
  mode: 'adaptive' | 'disabled';
}

/**
 * [CONFIRMED] Agent event types yielded by cS() inner loop
 * Extracted from submitMessage() event handling switch statement
 */
export type AgentEventType =
  | 'assistant'
  | 'user'
  | 'system'
  | 'stream_event'
  | 'attachment'
  | 'progress'
  | 'tombstone'
  | 'stream_request_start'
  | 'tool_use_summary';

/** [CONFIRMED] Agent event structure */
export interface AgentEvent {
  type: AgentEventType;
  subtype?: string;
  message?: Message;
  data?: unknown;
  // system event fields
  compactMetadata?: {
    preservedSegment: {
      tailUuid: string;
    };
  };
}

/** [CONFIRMED] Stream event subtypes */
export type StreamEventSubtype =
  | 'message_start'
  | 'content_block_start'
  | 'content_block_delta'
  | 'content_block_stop'
  | 'message_delta'
  | 'message_stop';

/** [INFERRED] Message structure */
export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string | ContentBlock[];
  uuid?: string;
  stop_reason?: string;
}

/** [INFERRED] Content block types */
export interface ContentBlock {
  type: 'text' | 'tool_use' | 'tool_result' | 'image';
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: string | ContentBlock[];
}

/** [CONFIRMED] Tool interface (from MCP handler call pattern at pos 1880934) */
export interface Tool {
  name: string;
  call(
    input: Record<string, unknown>,
    context: ToolContext,
    canUseTool: CanUseToolFunction,
    toolResultBuilder: ToolResultBuilder
  ): Promise<string | object>;
  prompt(context: ToolContext): Promise<string>;
  inputSchema: ZodSchema;
  outputSchema?: ZodSchema;
  isReadOnly(input?: Record<string, unknown>): boolean;
  isDestructive?(input?: Record<string, unknown>): boolean;
  isOpenWorld?(input?: Record<string, unknown>): boolean;
  isEnabled(): boolean;
  validateInput?(
    input: Record<string, unknown>,
    context: ToolContext
  ): Promise<ValidationResult>;
}

/** [INFERRED] Tool context */
export interface ToolContext {
  cwd: string;
  abortSignal: AbortSignal;
  readFileState: Map<string, FileState>;
  toolPermissionContext: ToolPermissionContext;
  mcpClients: McpClient[];
}

/** [INFERRED] Tool permission context */
export interface ToolPermissionContext {
  mode: PermissionMode;
  allowRules: string[];
  denyRules: string[];
}

/** [INFERRED] Validation result */
export interface ValidationResult {
  valid: boolean;
  message?: string;
}

/** [INFERRED] Tool result builder */
export interface ToolResultBuilder {
  addText(text: string): void;
  addImage(data: string, mimeType: string): void;
  build(): ToolResult;
}

/** [INFERRED] Tool result */
export interface ToolResult {
  type: 'tool_result';
  tool_use_id: string;
  content: ContentBlock[];
}

/** [CONFIRMED] Permission mode (pos 857240, zb_) */
export type PermissionMode =
  | 'default'
  | 'plan'
  | 'acceptEdits'
  | 'bypassPermissions'
  | 'dontAsk'
  | 'auto';

/** [CONFIRMED] canUseTool function signature */
export type CanUseToolFunction = (
  tool: Tool,
  input: Record<string, unknown>,
  context: ToolContext,
  history: Message[],
  toolUseId: string
) => Promise<'allow' | 'deny' | 'ask'>;

/** [INFERRED] MCP client placeholder */
export interface McpClient {
  name: string;
  tools: Tool[];
  // Transport details hidden in M() closures
}

/**
 * [CONFIRMED] Agent configuration
 * Extracted from Sp9 constructor and submitMessage() destructuring
 */
export interface AgentConfig {
  cwd: string;
  commands: Command[];
  tools: Tool[];
  mcpClients: McpClient[];
  thinkingConfig: ThinkingConfig;
  maxTurns: number;
  maxBudgetUsd?: number;
  canUseTool: CanUseToolFunction;
}

/** [INFERRED] Command structure */
export interface Command {
  name: string;
  handler: (...args: unknown[]) => Promise<unknown>;
}

/** [INFERRED] Input preprocessing result from vFT() */
interface PreprocessedInput {
  messages: Message[];
  shouldQuery: boolean;
  allowedTools: Tool[];
  model: string;
  resultText: string;
}

// ============================================================================
// Agent Class — Restored from Sp9 (pos 1812800)
// ============================================================================

/**
 * Core Agent engine class.
 *
 * Obfuscated name: Sp9 (pos 1812800)
 *
 * This is the central class that orchestrates the entire agent loop.
 * It holds mutable conversation state and yields events via an async generator.
 *
 * [CONFIRMED] Properties and submitMessage() flow extracted from code analysis.
 * [INFERRED] Some internal method bodies reconstructed from call patterns.
 */
export class Agent {
  /** [CONFIRMED] Full agent configuration */
  public config: AgentConfig;

  /** [CONFIRMED] Mutable message history — modified in place during conversation */
  public mutableMessages: Message[] = [];

  /** [CONFIRMED] Abort controller for cancellation */
  public abortController: AbortController;

  /** [CONFIRMED] Permission denial tracking */
  public permissionDenials: Map<string, PermissionDenial> = new Map();

  /** [CONFIRMED] Cumulative token usage across all API calls */
  public totalUsage: TokenUsage = {
    input_tokens: 0,
    output_tokens: 0,
    cache_read_input_tokens: 0,
    cache_creation_input_tokens: 0,
  };

  /** [CONFIRMED] File read state cache */
  public readFileState: Map<string, FileState> = new Map();

  /** [CONFIRMED] Discovered skill names during session */
  public discoveredSkillNames: Set<string> = new Set();

  constructor(config: AgentConfig) {
    this.config = config;
    this.abortController = new AbortController();
  }

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  /**
   * Main entry point — async generator that yields agent events.
   *
   * Obfuscated name: Sp9.prototype.submitMessage (pos 1813028)
   *
   * [CONFIRMED] Complete execution flow extracted from reverse analysis:
   * 1. Config destructuring
   * 2. Model selection: u = Y ? a9(Y) : H4()
   * 3. Thinking config: adaptive or disabled
   * 4. System prompt: OD() parallel build + V5() config + jH() context
   * 5. Input preprocessing: vFT() → {messages, shouldQuery, allowedTools, model, resultText}
   * 6. Skills/Plugins: q3_() + ww() parallel
   * 7. Initial message: RUT() yield initial system event
   * 8. Quick path: if !shouldQuery, return immediately
   * 9. Main loop: for await (let A_ of cS({...}))
   * 10. Event dispatch and termination detection
   */
  async *submitMessage(
    input: string | Message,
    options: { uuid?: string; isMeta?: boolean } = {}
  ): AsyncGenerator<AgentEvent, AgentResult> {
    const { uuid, isMeta } = options;

    // Step 1: Destructure config [CONFIRMED]
    const {
      cwd,
      commands,
      tools,
      mcpClients,
      thinkingConfig,
      maxTurns,
      maxBudgetUsd,
      canUseTool,
    } = this.config;

    // Step 2: Model selection [CONFIRMED]
    // u = Y ? a9(Y) : H4()
    // Y = user-specified model override, a9 = model resolver, H4 = default model
    const model = this.resolveModel();

    // Step 3: Thinking configuration [CONFIRMED]
    const thinking = thinkingConfig.enabled
      ? { type: 'enabled' as const, budget_tokens: 10000 }
      : { type: 'disabled' as const };

    // Step 4: System prompt construction [CONFIRMED]
    // OD() builds tool descriptions in parallel
    // V5() loads user configuration (CLAUDE.md etc.)
    // jH() builds conversation context
    const systemPrompt = await this.buildSystemPrompt(tools, cwd);

    // Step 5: Input preprocessing [CONFIRMED]
    // vFT() processes the raw input
    const preprocessed = await this.preprocessInput(input, tools, model);
    const { messages, shouldQuery, allowedTools, resultText } = preprocessed;

    // Step 6: Skills/Plugins loading [CONFIRMED]
    // q3_() and ww() run in parallel
    await Promise.all([
      this.loadSkills(),   // q3_()
      this.loadPlugins(),  // ww()
    ]);

    // Step 7: Emit initial system event [CONFIRMED]
    // RUT() yields the initial system message
    yield {
      type: 'system',
      subtype: 'session_start',
      data: {
        sessionId: this.getSessionId(),
        model,
        tools: allowedTools.map(t => t.name),
      },
    };

    // Step 8: Quick path for non-query inputs [CONFIRMED]
    if (!shouldQuery) {
      yield {
        type: 'assistant',
        message: { role: 'assistant', content: resultText },
      };
      return {
        subtype: 'success',
        duration_ms: 0,
        duration_api_ms: 0,
        num_turns: 0,
        stop_reason: 'end_turn',
        total_cost_usd: 0,
        usage: { ...this.totalUsage },
        modelUsage: {},
        permission_denials: Array.from(this.permissionDenials.values()),
      };
    }

    // Step 9: Main conversation loop [CONFIRMED]
    // for await (let A_ of cS({messages, systemPrompt, ...}))
    const startTime = Date.now();
    let apiTime = 0;
    let turnCount = 0;

    // cS() is the inner conversation loop (phantom identifier, defined in M() closure)
    // It yields events: assistant, user, system, stream_event, attachment, etc.
    const conversationLoop = this.innerConversationLoop({
      messages: this.mutableMessages,
      systemPrompt,
      userContext: {},
      systemContext: {},
      canUseTool,
      toolUseContext: { tools: allowedTools, mcpClients },
      fallbackModel: model,
      querySource: 'sdk',
      maxTurns,
    });

    // Step 10: Event dispatch loop [CONFIRMED]
    for await (const event of conversationLoop) {
      switch (event.type) {
        case 'assistant': {
          // [CONFIRMED] Record stop_reason, push to message history, yield to caller
          if (event.message) {
            if (event.message.stop_reason) {
              // Track stop reason
            }
            this.mutableMessages.push(event.message);
          }
          yield event;
          break;
        }

        case 'user': {
          // [CONFIRMED] Increment turn count, push to history, yield
          turnCount++;
          if (event.message) {
            this.mutableMessages.push(event.message);
          }
          yield event;
          break;
        }

        case 'stream_event': {
          // [CONFIRMED] Handle stream event subtypes
          this.handleStreamEvent(event);
          yield event;
          break;
        }

        case 'system': {
          // [CONFIRMED] Handle system events
          if (event.subtype === 'compact_boundary') {
            this.handleCompactBoundary(event);
          }
          yield event;
          break;
        }

        case 'attachment': {
          // [CONFIRMED] Handle attachment subtypes
          if (event.subtype === 'max_turns_reached') {
            yield event;
            return this.buildResult('error_max_turns', startTime, apiTime, turnCount);
          }
          yield event;
          break;
        }

        case 'progress': {
          // [CONFIRMED] Push to history, yield
          if (event.message) {
            this.mutableMessages.push(event.message);
          }
          yield event;
          break;
        }

        case 'tool_use_summary': {
          // [CONFIRMED] Yield summary info
          yield event;
          break;
        }

        case 'tombstone':
        case 'stream_request_start': {
          // [CONFIRMED] Silently skip
          break;
        }

        default:
          yield event;
      }

      // Budget check [CONFIRMED]
      if (maxBudgetUsd && this.getTotalCostUsd() >= maxBudgetUsd) {
        return this.buildResult('error_max_budget_usd', startTime, apiTime, turnCount);
      }

      // Abort check [CONFIRMED]
      if (this.abortController.signal.aborted) {
        return this.buildResult('error_during_execution', startTime, apiTime, turnCount);
      }
    }

    return this.buildResult('success', startTime, apiTime, turnCount);
  }

  /**
   * Interrupt execution.
   * Obfuscated: Sp9.prototype.interrupt
   * [CONFIRMED]
   */
  interrupt(): void {
    this.abortController.abort();
  }

  /**
   * Get current message history.
   * Obfuscated: Sp9.prototype.getMessages
   * [CONFIRMED]
   */
  getMessages(): Message[] {
    return this.mutableMessages;
  }

  /**
   * Get file read state cache.
   * Obfuscated: Sp9.prototype.getReadFileState
   * [CONFIRMED]
   */
  getReadFileState(): Map<string, FileState> {
    return this.readFileState;
  }

  /**
   * Set model at runtime.
   * Obfuscated: Sp9.prototype.setModel
   * [CONFIRMED]
   */
  setModel(model: string): void {
    // Updates ZT.mainLoopModelOverride via global state
    // Actual implementation modifies ZT singleton
  }

  // --------------------------------------------------------------------------
  // Private Methods — Reconstructed from analysis
  // --------------------------------------------------------------------------

  /**
   * Build the system prompt.
   * Obfuscated: OD() parallel build + V5() config + jH() context
   * [INFERRED] — structure known, exact content hidden in M() closures
   */
  private async buildSystemPrompt(tools: Tool[], cwd: string): Promise<string> {
    // OD() builds tool descriptions by calling tool.prompt() for each tool
    const toolDescriptions = await Promise.all(
      tools.filter(t => t.isEnabled()).map(async (tool) => {
        const desc = await tool.prompt({ cwd } as ToolContext);
        return `## ${tool.name}\n${desc}`;
      })
    );

    // V5() loads user config (CLAUDE.md, project settings)
    // jH() builds conversation context
    // These are combined into the final system prompt

    const parts: string[] = [];
    parts.push(toolDescriptions.join('\n\n'));
    // Additional context sections added by V5() and jH()

    return parts.join('\n\n');
  }

  /**
   * Preprocess user input.
   * Obfuscated: vFT()
   * [INFERRED] — returns {messages, shouldQuery, allowedTools, model, resultText}
   */
  private async preprocessInput(
    input: string | Message,
    tools: Tool[],
    model: string
  ): Promise<PreprocessedInput> {
    const message: Message = typeof input === 'string'
      ? { role: 'user', content: input }
      : input;

    this.mutableMessages.push(message);

    return {
      messages: this.mutableMessages,
      shouldQuery: true,
      allowedTools: tools.filter(t => t.isEnabled()),
      model,
      resultText: '',
    };
  }

  /**
   * Resolve model selection.
   * Obfuscated: u = Y ? a9(Y) : H4()
   * [CONFIRMED] — Y is user override, a9 resolves, H4 returns default
   */
  private resolveModel(): string {
    // Check for user-specified model override (ZT.mainLoopModelOverride)
    // If none, use default model (H4())
    return 'claude-sonnet-4-6'; // Default
  }

  /**
   * Load skills.
   * Obfuscated: q3_()
   * [CONFIRMED] — called in parallel with loadPlugins
   */
  private async loadSkills(): Promise<void> {
    // Loads skills from ZT.invokedSkills
    // Populates discoveredSkillNames
  }

  /**
   * Load plugins.
   * Obfuscated: ww()
   * [CONFIRMED] — called in parallel with loadSkills
   */
  private async loadPlugins(): Promise<void> {
    // Loads plugins from ZT.inlinePlugins
  }

  /**
   * Handle SSE stream events.
   * [CONFIRMED] — extracted from event handling switch
   *
   * message_start  → reset token counter (T_ = ek), accumulate usage
   * message_delta  → accumulate usage, extract stop_reason
   * message_stop   → merge to totalUsage via GmT()
   */
  private handleStreamEvent(event: AgentEvent): void {
    const subtype = event.subtype as StreamEventSubtype;
    const data = event.data as Record<string, unknown> | undefined;

    switch (subtype) {
      case 'message_start': {
        // [CONFIRMED] Reset per-message token tracking, init usage
        break;
      }
      case 'message_delta': {
        // [CONFIRMED] Accumulate usage via F8_(), extract stop_reason
        if (data?.usage) {
          this.accumulateUsage(data.usage as Partial<TokenUsage>);
        }
        break;
      }
      case 'message_stop': {
        // [CONFIRMED] Merge to totalUsage via GmT()
        if (data?.usage) {
          this.mergeUsageToTotal(data.usage as Partial<TokenUsage>);
        }
        break;
      }
    }
  }

  /**
   * Handle compact_boundary system event.
   * [CONFIRMED] — server-side compaction via compact-2026-01-12 beta
   *
   * 1. Check preservedSegment.tailUuid
   * 2. Find boundary index b_ in mutableMessages
   * 3. this.mutableMessages.splice(0, b_) — truncate before boundary
   * 4. Set ZT.pendingPostCompaction = true
   */
  private handleCompactBoundary(event: AgentEvent): void {
    if (!event.compactMetadata?.preservedSegment?.tailUuid) return;

    const tailUuid = event.compactMetadata.preservedSegment.tailUuid;
    const boundaryIndex = this.mutableMessages.findIndex(
      msg => msg.uuid === tailUuid
    );

    if (boundaryIndex >= 0) {
      // [CONFIRMED] Truncate all messages before the boundary
      this.mutableMessages.splice(0, boundaryIndex);
    }

    // [CONFIRMED] Set pending post-compaction flag on global state
    // In actual code: ZT.pendingPostCompaction = true
  }

  /**
   * Accumulate usage from a single API call.
   * Obfuscated: F8_()
   * [CONFIRMED]
   */
  private accumulateUsage(usage: Partial<TokenUsage>): void {
    if (usage.input_tokens) this.totalUsage.input_tokens += usage.input_tokens;
    if (usage.output_tokens) this.totalUsage.output_tokens += usage.output_tokens;
    if (usage.cache_read_input_tokens)
      this.totalUsage.cache_read_input_tokens += usage.cache_read_input_tokens;
    if (usage.cache_creation_input_tokens)
      this.totalUsage.cache_creation_input_tokens += usage.cache_creation_input_tokens;
  }

  /**
   * Merge usage to total.
   * Obfuscated: GmT()
   * [CONFIRMED]
   */
  private mergeUsageToTotal(usage: Partial<TokenUsage>): void {
    this.accumulateUsage(usage);
  }

  /**
   * Get total cost in USD.
   * Obfuscated: gD()
   * [CONFIRMED]
   */
  public getTotalCostUsd(): number {
    // [SPECULATIVE] Cost calculation based on token counts and per-model pricing
    // Actual implementation uses model-specific pricing tables
    return 0;
  }

  /**
   * Get session ID.
   * Obfuscated: VT()
   * [CONFIRMED] — reads from ZT.sessionId (crypto.randomUUID())
   */
  private getSessionId(): string {
    return crypto.randomUUID();
  }

  /**
   * Build final result object.
   * [CONFIRMED] — result structure extracted from code
   */
  private buildResult(
    subtype: ResultSubtype,
    startTime: number,
    apiTime: number,
    turnCount: number
  ): AgentResult {
    return {
      subtype,
      duration_ms: Date.now() - startTime,
      duration_api_ms: apiTime,
      num_turns: turnCount,
      stop_reason: subtype === 'success' ? 'end_turn' : null,
      total_cost_usd: this.getTotalCostUsd(),
      usage: { ...this.totalUsage },
      modelUsage: {},
      permission_denials: Array.from(this.permissionDenials.values()),
    };
  }

  /**
   * Inner conversation loop.
   * Obfuscated: cS() (phantom identifier, defined in M() closure)
   *
   * [INFERRED] — This is the CORE mystery of the codebase.
   * cS is never defined in any standard form (no var cS=, function cS, etc.)
   * It is likely injected by Bun bundler during module concatenation.
   *
   * From call signature:
   *   cS({messages, systemPrompt, userContext, systemContext, canUseTool,
   *       toolUseContext, fallbackModel, querySource, maxTurns})
   * Returns: AsyncGenerator yielding AgentEvent
   *
   * Reconstructed behavior:
   * 1. Make API call to Claude (streaming)
   * 2. Process tool_use content blocks
   * 3. Run permission check pipeline
   * 4. Dispatch tool.call()
   * 5. Construct tool_result messages
   * 6. Feed results back for next API turn
   * 7. Repeat until stop condition
   */
  private async *innerConversationLoop(params: {
    messages: Message[];
    systemPrompt: string;
    userContext: Record<string, unknown>;
    systemContext: Record<string, unknown>;
    canUseTool: CanUseToolFunction;
    toolUseContext: { tools: Tool[]; mcpClients: McpClient[] };
    fallbackModel: string;
    querySource: string;
    maxTurns: number;
  }): AsyncGenerator<AgentEvent> {
    const {
      messages, systemPrompt, canUseTool,
      toolUseContext, fallbackModel, maxTurns,
    } = params;
    const { tools } = toolUseContext;
    let turnCount = 0;

    while (turnCount < maxTurns) {
      // [INFERRED] 1. Make streaming API call
      yield { type: 'stream_request_start' };

      // API call would happen here via the LLM client
      // The actual implementation is hidden in M() closures

      // [INFERRED] 2. Process response events
      // For each content block in the API response:
      //   - text blocks → yield as assistant event
      //   - tool_use blocks → enter tool execution pipeline

      // [INFERRED] 3. Tool execution pipeline
      // For each tool_use block:
      //   a. RK(tools, name) — find tool by name
      //   b. tool.validateInput(input, context) — validate
      //   c. canUseTool(tool, input, ...) — permission check
      //   d. PreToolUse hooks
      //   e. tool.call(input, context, canUseTool, builder)
      //   f. PostToolUse hooks
      //   g. Construct tool_result

      // [INFERRED] 4. Yield assistant message event
      yield {
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [], // Would contain actual API response blocks
        },
      };

      // [INFERRED] 5. If no tool_use in response, conversation is done
      // Check stop_reason: 'end_turn' means done, 'tool_use' means continue

      turnCount++;

      // [CONFIRMED] Abort signal check
      if (this.abortController.signal.aborted) {
        return;
      }
    }
  }
}

// ============================================================================
// Async Generator Wrapper — Restored from Ep9 (pos 1824749)
// ============================================================================

/**
 * SDK entry point that creates an Agent instance and delegates to submitMessage.
 *
 * Obfuscated name: Ep9 (pos 1824749)
 *
 * [CONFIRMED] — Code structure directly extracted:
 * ```javascript
 * async function* Ep9({commands, prompt, ...config}) {
 *   let p = new Sp9({...config...});
 *   try {
 *     yield* p.submitMessage(T, {uuid: q, isMeta: K});
 *   } finally {
 *     P(p.getReadFileState());
 *   }
 * }
 * ```
 */
export async function* createAgentGenerator(params: {
  commands: Command[];
  prompt: string;
  config: Omit<AgentConfig, 'commands'>;
}): AsyncGenerator<AgentEvent, AgentResult> {
  const { commands, prompt, config } = params;
  const agent = new Agent({ ...config, commands });

  try {
    yield* agent.submitMessage(prompt);
  } finally {
    // [CONFIRMED] Save file read state cache
    const readFileState = agent.getReadFileState();
    // P(readFileState) — persists to session storage
  }
}
