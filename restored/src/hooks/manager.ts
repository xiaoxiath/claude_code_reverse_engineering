/**
 * Hook System Manager — Execution, Matching, and Lifecycle
 *
 * Reverse-engineered from claude_code_agent.js v2.1.83
 * Build: 2026-03-25T05:15:24Z
 *
 * Obfuscated name mapping:
 *   pa       → registerHook (hook registration into ZT.registeredHooks)
 *   Jq7      → hookEventListener (headless hook event listener, pos 1831025)
 *   Ok8      → HOOK_EVENTS (event type definitions, pos 866842)
 *   bA4      → HOOK_SCHEMAS (4 hook type schemas, pos 867300)
 *   ZT       → globalState singleton (registeredHooks field)
 *   C8       → executeShellCommand (reused for command hooks, pos 831030)
 *   Y8       → sandbox (sandbox context for command hooks)
 *
 * Source confidence:
 *   [CONFIRMED] — Directly extracted from minified code
 *   [INFERRED]  — Reconstructed from call sites and data flow
 *   [SPECULATIVE] — Reasonable guess based on patterns
 */

import type {
  HookEvent,
  HookDefinition,
  CommandHook,
  PromptHook,
  HttpHook,
  AgentHook,
  HookEntry,
  HooksConfig,
  HookStartedEvent,
  HookProgressEvent,
  HookResponseEvent,
  HookLifecycleEvent,
  HookContext,
  HookResult,
} from './types';

// ============================================================================
// Constants [CONFIRMED]
// ============================================================================

/**
 * Default timeout for command hooks in seconds.
 * [INFERRED] — common default across hook types
 */
const DEFAULT_COMMAND_TIMEOUT_S = 30;

/**
 * Default timeout for prompt hooks in seconds.
 * [INFERRED]
 */
const DEFAULT_PROMPT_TIMEOUT_S = 60;

/**
 * Default timeout for HTTP hooks in seconds.
 * [INFERRED]
 */
const DEFAULT_HTTP_TIMEOUT_S = 30;

/**
 * Default timeout for agent hooks in seconds.
 * [CONFIRMED] — from AgentHook schema default
 */
const DEFAULT_AGENT_TIMEOUT_S = 60;

/**
 * Default model for agent hooks.
 * [CONFIRMED] — AgentHook uses Haiku by default
 */
const DEFAULT_AGENT_MODEL = 'claude-haiku-4-5';

/**
 * Exit code that triggers model rewake for asyncRewake hooks.
 * [CONFIRMED] — from bA4 schema: "exit code 2 wakes the model"
 */
const REWAKE_EXIT_CODE = 2;

// ============================================================================
// Hook Matcher [CONFIRMED]
// ============================================================================

/**
 * Matches a tool name against a hook matcher pattern.
 *
 * Matcher syntax [CONFIRMED]:
 * - Exact match: "Bash"
 * - Pipe-separated: "Edit|Write"
 * - Empty/undefined: matches all (wildcard)
 *
 * [CONFIRMED] — extracted from hook configuration processing
 *
 * @param matcher - The matcher pattern string
 * @param toolName - The tool name to test
 * @returns true if matched
 */
export function matchHookMatcher(matcher: string | undefined, toolName: string | undefined): boolean {
  // [CONFIRMED] Empty matcher = match all
  if (!matcher || matcher.trim() === '') {
    return true;
  }

  if (!toolName) {
    return false;
  }

  // [CONFIRMED] Pipe-separated matcher: "Edit|Write"
  const matchers = matcher.split('|').map((m) => m.trim());
  return matchers.includes(toolName);
}

/**
 * Finds all hook entries that match a given event and optional tool name.
 *
 * [INFERRED] — reconstructed from hook execution call sites
 *
 * @param config - The hooks configuration from settings
 * @param event - The hook event type
 * @param toolName - Optional tool name for tool-related events
 * @returns Array of matching HookDefinition objects
 */
export function findMatchingHooks(
  config: HooksConfig | undefined,
  event: HookEvent,
  toolName?: string,
): HookDefinition[] {
  if (!config) return [];

  const entries = config[event];
  if (!entries || !Array.isArray(entries)) return [];

  const matched: HookDefinition[] = [];

  for (const entry of entries) {
    if (matchHookMatcher(entry.matcher, toolName)) {
      matched.push(...entry.hooks);
    }
  }

  return matched;
}

// ============================================================================
// Environment Variable Interpolation [CONFIRMED]
// ============================================================================

/**
 * Interpolates environment variables in a string.
 * Used for HTTP hook headers: `$VAR_NAME` → `process.env.VAR_NAME`
 *
 * [CONFIRMED] — from HttpHook schema: "supports $VAR_NAME interpolation"
 *
 * @param value - String with $VAR_NAME references
 * @param allowedVars - Whitelist of allowed env vars (empty = allow all)
 */
function interpolateEnvVars(value: string, allowedVars?: string[]): string {
  return value.replace(/\$([A-Z_][A-Z0-9_]*)/g, (match, varName) => {
    // [CONFIRMED] allowedEnvVars whitelist for security
    if (allowedVars && allowedVars.length > 0 && !allowedVars.includes(varName)) {
      return match; // Leave unresolved if not in whitelist
    }
    return process.env[varName] ?? match;
  });
}

// ============================================================================
// Hook Executor Functions [CONFIRMED/INFERRED]
// ============================================================================

/**
 * Executes a command hook by spawning a shell process.
 *
 * Reuses the same shell execution infrastructure as the Bash tool (C8).
 * [CONFIRMED] — command hooks execute shell commands
 * [INFERRED] — lifecycle event emission pattern from Jq7
 *
 * @param hook - Command hook definition
 * @param context - Hook input context (serialized to JSON as $ARGUMENTS)
 * @param hookId - Unique ID for this hook execution
 * @param onLifecycle - Callback for lifecycle events
 */
async function executeCommandHook(
  hook: CommandHook,
  context: HookContext,
  hookId: string,
  onLifecycle?: (event: HookLifecycleEvent) => void,
): Promise<HookResult> {
  const timeout = (hook.timeout ?? DEFAULT_COMMAND_TIMEOUT_S) * 1000;
  const startTime = Date.now();

  // [CONFIRMED] $ARGUMENTS replaced with hook input JSON
  const inputJson = JSON.stringify(context);

  // Set up environment with hook input
  const env = {
    ...process.env,
    TOOL_INPUT: context.tool_input ? JSON.stringify(context.tool_input) : '',
    TOOL_NAME: context.tool_name ?? '',
    ARGUMENTS: inputJson,
    HOOK_EVENT: hookId,
  };

  // [CONFIRMED] command field is the shell command
  const command = hook.command;

  // [CONFIRMED] shell type defaults to bash
  const shell = hook.shell ?? 'bash';
  const shellPath = shell === 'powershell' ? 'powershell' : (process.env.SHELL || '/bin/bash');

  try {
    // [INFERRED] Uses child_process.spawn or execa, similar to C8
    const { execFile } = await import('child_process');
    const { promisify } = await import('util');
    const execFileAsync = promisify(execFile);

    const result = await Promise.race([
      execFileAsync(shellPath, ['-c', command], {
        env,
        timeout,
        maxBuffer: 1024 * 1024, // 1MB, same as C8
        encoding: 'utf-8',
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Hook timeout')), timeout),
      ),
    ]);

    // [CONFIRMED] Emit progress with stdout/stderr
    if (onLifecycle && (result.stdout || result.stderr)) {
      onLifecycle({
        type: 'hook_progress',
        hookId,
        hookName: hook.command.substring(0, 50),
        hookEvent: 'PreToolUse' as HookEvent, // Filled by caller
        stdout: result.stdout,
        stderr: result.stderr,
      });
    }

    return {
      success: true,
      output: result.stdout,
      exitCode: 0,
      blocked: false,
      durationMs: Date.now() - startTime,
    };
  } catch (error: any) {
    const exitCode = error.code ?? error.status ?? 1;

    return {
      success: false,
      output: error.stderr || error.message,
      exitCode,
      // [INFERRED] Non-zero exit code from PreToolUse hook blocks the operation
      blocked: exitCode !== 0,
      blockReason: exitCode !== 0 ? `Hook exited with code ${exitCode}` : undefined,
      durationMs: Date.now() - startTime,
    };
  }
}

/**
 * Executes a prompt hook by sending a prompt to an LLM.
 *
 * [CONFIRMED] — prompt hooks use $ARGUMENTS substitution
 * [INFERRED] — uses the same LLM client infrastructure
 */
async function executePromptHook(
  hook: PromptHook,
  context: HookContext,
  hookId: string,
  onLifecycle?: (event: HookLifecycleEvent) => void,
): Promise<HookResult> {
  const timeout = (hook.timeout ?? DEFAULT_PROMPT_TIMEOUT_S) * 1000;
  const startTime = Date.now();

  // [CONFIRMED] $ARGUMENTS replaced with hook input JSON
  const inputJson = JSON.stringify(context);
  const prompt = hook.prompt.replace(/\$ARGUMENTS/g, inputJson);
  const model = hook.model ?? DEFAULT_AGENT_MODEL;

  try {
    // [INFERRED] Calls the LLM API with the constructed prompt
    // In the actual code, this delegates to the same createMessage infrastructure
    const response = await Promise.race([
      callLlmForHook(prompt, model),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Prompt hook timeout')), timeout),
      ),
    ]);

    return {
      success: true,
      output: response,
      blocked: false,
      durationMs: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      success: false,
      output: error.message,
      blocked: false,
      durationMs: Date.now() - startTime,
    };
  }
}

/**
 * Executes an HTTP hook by POSTing the hook input to a URL.
 *
 * [CONFIRMED] — HTTP hooks POST hook input JSON to a URL
 * [CONFIRMED] — headers support $VAR_NAME interpolation with allowedEnvVars
 */
async function executeHttpHook(
  hook: HttpHook,
  context: HookContext,
  hookId: string,
  onLifecycle?: (event: HookLifecycleEvent) => void,
): Promise<HookResult> {
  const timeout = (hook.timeout ?? DEFAULT_HTTP_TIMEOUT_S) * 1000;
  const startTime = Date.now();

  const inputJson = JSON.stringify(context);

  // [CONFIRMED] Build headers with env var interpolation
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (hook.headers) {
    for (const [key, value] of Object.entries(hook.headers)) {
      headers[key] = interpolateEnvVars(value, hook.allowedEnvVars);
    }
  }

  try {
    // [CONFIRMED] Uses fetch (Bun native) for HTTP hooks
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(hook.url, {
      method: 'POST',
      headers,
      body: inputJson,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const responseText = await response.text();

    if (!response.ok) {
      return {
        success: false,
        output: `HTTP ${response.status}: ${responseText}`,
        blocked: false,
        durationMs: Date.now() - startTime,
      };
    }

    return {
      success: true,
      output: responseText,
      blocked: false,
      durationMs: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      success: false,
      output: error.message,
      blocked: false,
      durationMs: Date.now() - startTime,
    };
  }
}

/**
 * Executes an agent hook by delegating to an AI agent for verification.
 *
 * [CONFIRMED] — agent hooks use $ARGUMENTS substitution
 * [CONFIRMED] — default model is Haiku, default timeout 60s
 */
async function executeAgentHook(
  hook: AgentHook,
  context: HookContext,
  hookId: string,
  onLifecycle?: (event: HookLifecycleEvent) => void,
): Promise<HookResult> {
  const timeout = (hook.timeout ?? DEFAULT_AGENT_TIMEOUT_S) * 1000;
  const startTime = Date.now();

  // [CONFIRMED] $ARGUMENTS replaced with hook input JSON
  const inputJson = JSON.stringify(context);
  const prompt = hook.prompt.replace(/\$ARGUMENTS/g, inputJson);
  const model = hook.model ?? DEFAULT_AGENT_MODEL;

  try {
    // [INFERRED] Uses an agent subprocess or direct LLM call
    // The agent hook is a lightweight verification agent
    const response = await Promise.race([
      callLlmForHook(prompt, model),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Agent hook timeout')), timeout),
      ),
    ]);

    // [INFERRED] Agent hooks return allow/block outcomes
    const outcome = parseAgentOutcome(response);

    return {
      success: true,
      output: response,
      blocked: outcome === 'block',
      blockReason: outcome === 'block' ? `Agent hook blocked: ${response}` : undefined,
      durationMs: Date.now() - startTime,
    };
  } catch (error: any) {
    return {
      success: false,
      output: error.message,
      blocked: false,
      durationMs: Date.now() - startTime,
    };
  }
}

// ============================================================================
// Helper Functions [INFERRED]
// ============================================================================

/**
 * Calls the LLM API for prompt/agent hooks.
 * [INFERRED] — simplified stub; actual implementation uses the full LLM client
 */
async function callLlmForHook(prompt: string, model: string): Promise<string> {
  // In the actual bundled code, this calls into the same API client
  // infrastructure used by the main agent loop (createMessage/createMessageStream).
  // The hook system passes the model and prompt, receives a text response.
  //
  // [SPECULATIVE] Implementation detail:
  // The actual code likely instantiates a lightweight API call without
  // the full agent loop overhead.
  throw new Error(
    'callLlmForHook: stub — actual implementation delegates to LLM client infrastructure',
  );
}

/**
 * Parses agent hook response to determine allow/block outcome.
 * [INFERRED] — agent hooks return structured responses
 */
function parseAgentOutcome(response: string): 'allow' | 'block' | 'error' {
  const lower = response.toLowerCase();
  if (lower.includes('block') || lower.includes('deny') || lower.includes('reject')) {
    return 'block';
  }
  if (lower.includes('allow') || lower.includes('approve') || lower.includes('permit')) {
    return 'allow';
  }
  return 'allow'; // Default to allow if unclear
}

// ============================================================================
// Hook Lifecycle Event Emission [CONFIRMED, pos 1831025]
// ============================================================================

/**
 * Generates a unique hook execution ID.
 * [INFERRED]
 */
function generateHookId(): string {
  return `hook_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Builds the human-readable hook name for lifecycle events.
 * [INFERRED] — derived from hook definition
 */
function getHookName(hook: HookDefinition): string {
  switch (hook.type) {
    case 'command':
      return `cmd:${hook.command.substring(0, 40)}`;
    case 'prompt':
      return `prompt:${hook.prompt.substring(0, 30)}`;
    case 'http':
      return `http:${hook.url}`;
    case 'agent':
      return `agent:${hook.prompt.substring(0, 30)}`;
    default:
      return 'unknown';
  }
}

// ============================================================================
// HookManager — Central Hook Execution Engine [CONFIRMED/INFERRED]
// ============================================================================

/**
 * Hook execution outcome used by PreToolUse to decide whether to proceed.
 * [INFERRED] — from hook_response outcome field
 */
export type HookOutcome = 'allow' | 'block' | 'error';

/**
 * Aggregated result from executing all hooks for a single event.
 * [INFERRED]
 */
export interface HookExecutionResult {
  /** Overall outcome: blocked if ANY hook blocked */
  outcome: HookOutcome;
  /** Individual results for each hook */
  results: HookResult[];
  /** Reason for blocking (from first blocking hook) */
  blockReason?: string;
  /** Total execution time */
  totalDurationMs: number;
}

/**
 * HookManager — Central hook system implementation.
 *
 * Manages hook registration, matching, execution, and lifecycle events.
 * Integrates with the global state singleton (ZT.registeredHooks) for
 * runtime hook registration.
 *
 * [CONFIRMED] — hook system exists with pa() registration, Jq7 lifecycle
 * [INFERRED] — manager class structure reconstructed from call patterns
 *
 * Key integration points:
 * - pa() registers hooks into ZT.registeredHooks at runtime
 * - Jq7() (pos 1831025) listens for hook lifecycle events in headless mode
 * - Tool execution pipeline calls hooks at PreToolUse/PostToolUse/PostToolUseFailure
 * - Session lifecycle triggers SessionStart/SessionEnd/Stop hooks
 */
export class HookManager {
  /** Settings-based hooks configuration */
  private config: HooksConfig;

  /** Runtime-registered hooks (from pa() / ZT.registeredHooks) */
  private runtimeHooks: Map<HookEvent, HookEntry[]>;

  /** Lifecycle event listeners (Jq7 registers here) */
  private lifecycleListeners: Array<(event: HookLifecycleEvent) => void>;

  /** Hooks marked as 'once' that have been executed */
  private executedOnceHooks: Set<string>;

  /** Currently running async hooks (background, non-blocking) */
  private asyncHookHandles: Map<string, { hookId: string; abortController: AbortController }>;

  constructor(config: HooksConfig = {}) {
    this.config = config;
    this.runtimeHooks = new Map();
    this.lifecycleListeners = [];
    this.executedOnceHooks = new Set();
    this.asyncHookHandles = new Map();
  }

  // --------------------------------------------------------------------------
  // Hook Registration [CONFIRMED]
  // --------------------------------------------------------------------------

  /**
   * Registers a hook at runtime.
   * Obfuscated: pa()
   * [CONFIRMED] — hooks are registered into ZT.registeredHooks
   */
  registerHook(event: HookEvent, entry: HookEntry): void {
    const existing = this.runtimeHooks.get(event) ?? [];
    existing.push(entry);
    this.runtimeHooks.set(event, existing);
  }

  /**
   * Updates the settings-based hooks configuration.
   * Called when settings are reloaded.
   * [INFERRED]
   */
  updateConfig(config: HooksConfig): void {
    this.config = config;
  }

  // --------------------------------------------------------------------------
  // Lifecycle Listener Registration [CONFIRMED, pos 1831025]
  // --------------------------------------------------------------------------

  /**
   * Registers a lifecycle event listener.
   * Obfuscated: Jq7() registers such a listener in headless mode.
   *
   * [CONFIRMED] — Jq7 function at pos 1831025 hooks into lifecycle events
   * for stream-json / verbose output in headless mode.
   */
  addLifecycleListener(listener: (event: HookLifecycleEvent) => void): () => void {
    this.lifecycleListeners.push(listener);
    // Return unsubscribe function
    return () => {
      const idx = this.lifecycleListeners.indexOf(listener);
      if (idx >= 0) this.lifecycleListeners.splice(idx, 1);
    };
  }

  /**
   * Emits a lifecycle event to all registered listeners.
   * [CONFIRMED] — from Jq7 hook_started/hook_progress/hook_response pattern
   */
  private emitLifecycleEvent(event: HookLifecycleEvent): void {
    for (const listener of this.lifecycleListeners) {
      try {
        listener(event);
      } catch {
        // Lifecycle listener errors are silently ignored
      }
    }
  }

  // --------------------------------------------------------------------------
  // Core Execution [CONFIRMED/INFERRED]
  // --------------------------------------------------------------------------

  /**
   * Executes all hooks matching a given event and optional tool name.
   *
   * For PreToolUse: if ANY hook returns `blocked=true`, the overall outcome
   * is 'block' and the tool call is prevented.
   *
   * For PostToolUse/PostToolUseFailure: hooks are informational; outcome
   * does not affect the tool result.
   *
   * [CONFIRMED] — hooks execute for PreToolUse/PostToolUse events
   * [INFERRED] — execution flow reconstructed from tool pipeline
   *
   * @param event - The hook event type
   * @param context - Hook input context
   * @param toolName - Tool name for matcher (optional for non-tool events)
   * @returns Aggregated execution result
   */
  async executeHooks(
    event: HookEvent,
    context: HookContext,
    toolName?: string,
  ): Promise<HookExecutionResult> {
    const startTime = Date.now();

    // Merge settings-based and runtime hooks
    const settingsHooks = findMatchingHooks(this.config, event, toolName);
    const runtimeEntries = this.runtimeHooks.get(event) ?? [];
    const runtimeMatched: HookDefinition[] = [];
    for (const entry of runtimeEntries) {
      if (matchHookMatcher(entry.matcher, toolName)) {
        runtimeMatched.push(...entry.hooks);
      }
    }

    const allHooks = [...settingsHooks, ...runtimeMatched];

    if (allHooks.length === 0) {
      return {
        outcome: 'allow',
        results: [],
        totalDurationMs: 0,
      };
    }

    const results: HookResult[] = [];
    let outcome: HookOutcome = 'allow';
    let blockReason: string | undefined;

    for (const hook of allHooks) {
      // [CONFIRMED] once: true — skip if already executed
      const hookKey = `${event}:${getHookName(hook)}`;
      if (hook.once && this.executedOnceHooks.has(hookKey)) {
        continue;
      }

      const hookId = generateHookId();
      const hookName = getHookName(hook);

      // [CONFIRMED] Emit hook_started lifecycle event
      this.emitLifecycleEvent({
        type: 'hook_started',
        hookId,
        hookName,
        hookEvent: event,
      });

      // [CONFIRMED] async hooks run in background (non-blocking)
      if (hook.type === 'command' && (hook.async || hook.asyncRewake)) {
        this.executeAsyncHook(hook, context, hookId, event);
        // Mark once if applicable
        if (hook.once) this.executedOnceHooks.add(hookKey);
        continue;
      }

      // Execute synchronously
      const onLifecycle = (evt: HookLifecycleEvent) => {
        // Patch hookEvent into lifecycle events
        const patched = { ...evt, hookEvent: event };
        this.emitLifecycleEvent(patched);
      };

      let result: HookResult;
      try {
        result = await this.executeSingleHook(hook, context, hookId, onLifecycle);
      } catch (error: any) {
        result = {
          success: false,
          output: error.message,
          blocked: false,
          durationMs: Date.now() - startTime,
        };
      }

      results.push(result);

      // [CONFIRMED] Emit hook_response lifecycle event
      this.emitLifecycleEvent({
        type: 'hook_response',
        hookId,
        hookName,
        hookEvent: event,
        output: result.output,
        exit_code: result.exitCode,
        outcome: result.blocked ? 'block' : result.success ? 'allow' : 'error',
      });

      // Mark once if applicable
      if (hook.once) this.executedOnceHooks.add(hookKey);

      // [INFERRED] First blocking hook determines overall outcome
      if (result.blocked && outcome !== 'block') {
        outcome = 'block';
        blockReason = result.blockReason;
      }
    }

    return {
      outcome,
      results,
      blockReason,
      totalDurationMs: Date.now() - startTime,
    };
  }

  /**
   * Routes a single hook to the appropriate executor.
   * [INFERRED] — dispatch based on hook.type
   */
  private async executeSingleHook(
    hook: HookDefinition,
    context: HookContext,
    hookId: string,
    onLifecycle?: (event: HookLifecycleEvent) => void,
  ): Promise<HookResult> {
    switch (hook.type) {
      case 'command':
        return executeCommandHook(hook, context, hookId, onLifecycle);
      case 'prompt':
        return executePromptHook(hook, context, hookId, onLifecycle);
      case 'http':
        return executeHttpHook(hook, context, hookId, onLifecycle);
      case 'agent':
        return executeAgentHook(hook, context, hookId, onLifecycle);
      default:
        return {
          success: false,
          output: `Unknown hook type: ${(hook as any).type}`,
          blocked: false,
          durationMs: 0,
        };
    }
  }

  // --------------------------------------------------------------------------
  // Async (Background) Hook Execution [CONFIRMED]
  // --------------------------------------------------------------------------

  /**
   * Executes an async hook in the background (non-blocking).
   *
   * [CONFIRMED] — command hooks support async: true and asyncRewake: true
   * [CONFIRMED] — asyncRewake hooks wake the model when exit code is 2
   */
  private executeAsyncHook(
    hook: CommandHook,
    context: HookContext,
    hookId: string,
    event: HookEvent,
  ): void {
    const abortController = new AbortController();
    this.asyncHookHandles.set(hookId, { hookId, abortController });

    const hookName = getHookName(hook);

    // Fire and forget
    executeCommandHook(hook, context, hookId, (evt) => {
      const patched = { ...evt, hookEvent: event };
      this.emitLifecycleEvent(patched);
    })
      .then((result) => {
        // [CONFIRMED] Emit hook_response for async hooks too
        this.emitLifecycleEvent({
          type: 'hook_response',
          hookId,
          hookName,
          hookEvent: event,
          output: result.output,
          exit_code: result.exitCode,
          outcome: result.blocked ? 'block' : result.success ? 'allow' : 'error',
        });

        // [CONFIRMED] asyncRewake: exit code 2 triggers model rewake
        if (hook.asyncRewake && result.exitCode === REWAKE_EXIT_CODE) {
          this.onAsyncRewake(hookId, hookName, result);
        }
      })
      .catch(() => {
        // Background hook errors are logged but do not block
      })
      .finally(() => {
        this.asyncHookHandles.delete(hookId);
      });
  }

  /**
   * Called when an asyncRewake hook exits with code 2.
   * Signals the agent to resume processing.
   *
   * [CONFIRMED] — asyncRewake wakes the model on exit code 2
   * [SPECULATIVE] — exact rewake mechanism is behind M() closure
   */
  private onAsyncRewake(hookId: string, hookName: string, result: HookResult): void {
    // In the actual code, this injects a synthetic event or message
    // into the agent's message queue to trigger a new processing turn.
    // The exact mechanism is within the M() closure barrier.
    //
    // Likely pattern: push a system message or emit an event that
    // the agent's main loop picks up.
    console.error(`[HookManager] asyncRewake triggered by ${hookName} (hookId=${hookId})`);
  }

  // --------------------------------------------------------------------------
  // Convenience Methods for Tool Pipeline [INFERRED]
  // --------------------------------------------------------------------------

  /**
   * Executes PreToolUse hooks. Returns whether the tool call should proceed.
   *
   * [CONFIRMED] — PreToolUse hooks can block tool execution
   * [INFERRED] — called from the tool execution pipeline before tool.call()
   */
  async runPreToolUseHooks(
    toolName: string,
    toolInput: Record<string, unknown>,
    agentId?: string,
    agentType?: string,
  ): Promise<{ allowed: boolean; blockReason?: string }> {
    const context: HookContext = {
      agent_id: agentId,
      agent_type: agentType,
      tool_name: toolName,
      tool_input: toolInput,
    };

    const result = await this.executeHooks('PreToolUse', context, toolName);

    return {
      allowed: result.outcome !== 'block',
      blockReason: result.blockReason,
    };
  }

  /**
   * Executes PostToolUse hooks. Informational only (cannot block).
   *
   * [CONFIRMED] — PostToolUse fires after successful tool execution
   */
  async runPostToolUseHooks(
    toolName: string,
    toolInput: Record<string, unknown>,
    toolResult: unknown,
    agentId?: string,
    agentType?: string,
  ): Promise<void> {
    const context: HookContext = {
      agent_id: agentId,
      agent_type: agentType,
      tool_name: toolName,
      tool_input: toolInput,
      tool_result: toolResult,
    };

    await this.executeHooks('PostToolUse', context, toolName);
  }

  /**
   * Executes PostToolUseFailure hooks. Informational only.
   *
   * [CONFIRMED] — PostToolUseFailure fires when tool execution fails
   */
  async runPostToolUseFailureHooks(
    toolName: string,
    toolInput: Record<string, unknown>,
    error: string,
    agentId?: string,
    agentType?: string,
  ): Promise<void> {
    const context: HookContext = {
      agent_id: agentId,
      agent_type: agentType,
      tool_name: toolName,
      tool_input: toolInput,
      error,
    };

    await this.executeHooks('PostToolUseFailure', context, toolName);
  }

  /**
   * Executes session lifecycle hooks (SessionStart, SessionEnd, Stop).
   * [CONFIRMED] — these are non-tool events, no matcher needed
   */
  async runSessionHook(
    event: 'SessionStart' | 'SessionEnd' | 'Stop' | 'StopFailure',
    context: HookContext = {},
  ): Promise<void> {
    await this.executeHooks(event, context);
  }

  // --------------------------------------------------------------------------
  // Cleanup [INFERRED]
  // --------------------------------------------------------------------------

  /**
   * Aborts all running async hooks and cleans up.
   * [INFERRED] — called during session shutdown
   */
  async cleanup(): Promise<void> {
    for (const [hookId, handle] of this.asyncHookHandles) {
      handle.abortController.abort();
    }
    this.asyncHookHandles.clear();
    this.executedOnceHooks.clear();
  }
}

// ============================================================================
// Module Export — hookEventListener (Jq7) [CONFIRMED, pos 1831025]
// ============================================================================

/**
 * Creates a hook lifecycle event listener for headless mode.
 * Obfuscated: Jq7 (pos 1831025)
 *
 * In headless mode with verbose + stream-json output, this function
 * registers a listener that formats and emits hook lifecycle events
 * (hook_started, hook_progress, hook_response) to the output stream.
 *
 * [CONFIRMED] — from Jq7 function structure at pos 1831025
 *
 * @param emitEvent - Function to emit events to the output stream
 * @returns Unsubscribe function
 */
export function createHookEventListener(
  hookManager: HookManager,
  emitEvent: (event: { type: string; data: unknown }) => void,
): () => void {
  return hookManager.addLifecycleListener((lifecycleEvent) => {
    emitEvent({
      type: lifecycleEvent.type,
      data: lifecycleEvent,
    });
  });
}
