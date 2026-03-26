/**
 * Hook Type Definitions — Based on 24 Hook Events and 4 Hook Types
 *
 * Reverse-engineered from claude_code_agent.js v2.1.83
 *
 * Obfuscated name mapping:
 *   Ok8      → HOOK_EVENTS (event type definitions, pos 866842)
 *   bA4      → HOOK_SCHEMAS (4 hook type schemas, pos 867300)
 *   pa       → registerHook (hook registration function)
 *   Jq7      → hookEventListener (headless hook event listener, pos 1831025)
 *
 * Source confidence:
 *   [CONFIRMED] — Directly extracted from minified code
 *   [INFERRED]  — Reconstructed from call sites
 */

// ============================================================================
// Hook Events [CONFIRMED, pos 866842]
// ============================================================================

/**
 * All 24 hook event types.
 * Obfuscated: Ok8 (pos 866842)
 * [CONFIRMED] — complete list extracted
 */
export type HookEvent =
  | 'PreToolUse'
  | 'PostToolUse'
  | 'PostToolUseFailure'
  | 'Notification'
  | 'UserPromptSubmit'
  | 'SessionStart'
  | 'SessionEnd'
  | 'Stop'
  | 'StopFailure'
  | 'SubagentStart'
  | 'SubagentStop'
  | 'PreCompact'
  | 'PostCompact'
  | 'PermissionRequest'
  | 'Setup'
  | 'TeammateIdle'
  | 'TaskCompleted'
  | 'Elicitation'
  | 'ElicitationResult'
  | 'ConfigChange'
  | 'WorktreeCreate'
  | 'WorktreeRemove'
  | 'InstructionsLoaded'
  | 'CwdChanged'
  | 'FileChanged';

/**
 * Events that can be configured in settings.
 * [CONFIRMED, pos 935918]
 */
export const CONFIGURABLE_HOOK_EVENTS: HookEvent[] = [
  'PreToolUse',
  'PostToolUse',
  'Notification',
  'UserPromptSubmit',
  'SessionStart',
  'SessionEnd',
  'Stop',
  'SubagentStop',
  'PreCompact',
  'PostCompact',
  'TeammateIdle',
  'TaskCompleted',
];

// ============================================================================
// Hook Types [CONFIRMED, pos 867300 bA4()]
// ============================================================================

/**
 * Command hook — executes a shell command.
 * [CONFIRMED]
 */
export interface CommandHook {
  type: 'command';
  /** Shell command to execute */
  command: string;
  /** Shell type — default: bash (uses $SHELL) */
  shell?: 'bash' | 'powershell';
  /** Timeout in seconds */
  timeout?: number;
  /** Spinner text displayed during execution */
  statusMessage?: string;
  /** If true, hook runs once then is removed */
  once?: boolean;
  /** If true, runs in background (non-blocking) */
  async?: boolean;
  /**
   * If true, runs in background AND wakes the model
   * when the hook exits with code 2.
   */
  asyncRewake?: boolean;
}

/**
 * Prompt hook — sends a prompt to an LLM.
 * [CONFIRMED]
 */
export interface PromptHook {
  type: 'prompt';
  /** LLM prompt; $ARGUMENTS is replaced with hook input JSON */
  prompt: string;
  /** Model to use (e.g., "claude-sonnet-4-6") */
  model?: string;
  /** Timeout in seconds */
  timeout?: number;
  /** Spinner text */
  statusMessage?: string;
  /** Run once then remove */
  once?: boolean;
}

/**
 * HTTP hook — POSTs hook input JSON to a URL.
 * [CONFIRMED]
 */
export interface HttpHook {
  type: 'http';
  /** URL to POST hook input JSON */
  url: string;
  /** Timeout in seconds */
  timeout?: number;
  /** Headers — supports $VAR_NAME interpolation */
  headers?: Record<string, string>;
  /** Whitelist for env var interpolation in headers */
  allowedEnvVars?: string[];
  /** Spinner text */
  statusMessage?: string;
  /** Run once then remove */
  once?: boolean;
}

/**
 * Agent hook — uses an AI agent for verification.
 * [CONFIRMED]
 */
export interface AgentHook {
  type: 'agent';
  /** Verification prompt; $ARGUMENTS is replaced with hook input */
  prompt: string;
  /** Model — default: Haiku */
  model?: string;
  /** Timeout in seconds — default: 60 */
  timeout?: number;
  /** Spinner text */
  statusMessage?: string;
  /** Run once then remove */
  once?: boolean;
}

/** Union of all hook types */
export type HookDefinition = CommandHook | PromptHook | HttpHook | AgentHook;

// ============================================================================
// Hook Configuration [CONFIRMED]
// ============================================================================

/**
 * Hook entry with matcher and hook list.
 *
 * Matcher syntax [CONFIRMED]:
 * - Exact match: "Bash"
 * - Pipe-separated: "Edit|Write"
 * - Match all: empty or omitted
 */
export interface HookEntry {
  /** Tool name matcher (exact, pipe-separated, or empty for all) */
  matcher?: string;
  /** List of hooks to execute when matched */
  hooks: HookDefinition[];
}

/**
 * Complete hooks configuration.
 * [CONFIRMED] — from settings validation schema
 */
export type HooksConfig = {
  [K in HookEvent]?: HookEntry[];
};

// ============================================================================
// Hook Lifecycle Events [CONFIRMED, pos 1831025]
// ============================================================================

/**
 * Hook lifecycle events emitted during execution.
 * [CONFIRMED] — from Jq7 function (headless hook event listener)
 */
export interface HookStartedEvent {
  type: 'hook_started';
  hookId: string;
  hookName: string;
  hookEvent: HookEvent;
}

export interface HookProgressEvent {
  type: 'hook_progress';
  hookId: string;
  hookName: string;
  hookEvent: HookEvent;
  stdout?: string;
  stderr?: string;
  output?: string;
}

export interface HookResponseEvent {
  type: 'hook_response';
  hookId: string;
  hookName: string;
  hookEvent: HookEvent;
  output?: string;
  stdout?: string;
  stderr?: string;
  exit_code?: number;
  outcome?: 'allow' | 'block' | 'error';
}

export type HookLifecycleEvent =
  | HookStartedEvent
  | HookProgressEvent
  | HookResponseEvent;

// ============================================================================
// Hook Input Context [CONFIRMED, pos 1756513]
// ============================================================================

/**
 * Context passed to hooks, includes agent identification.
 * [CONFIRMED] — PreToolUse, PostToolUse, PostToolUseFailure include agent_id/type
 */
export interface HookContext {
  /** Which agent triggered the hook */
  agent_id?: string;
  /** Agent type (main or sub-agent) */
  agent_type?: string;
  /** Tool name (for tool-related hooks) */
  tool_name?: string;
  /** Tool input (for tool-related hooks) */
  tool_input?: Record<string, unknown>;
  /** Tool result (for PostToolUse) */
  tool_result?: unknown;
  /** Error info (for PostToolUseFailure) */
  error?: string;
}

// ============================================================================
// Hook Result [INFERRED]
// ============================================================================

/**
 * Result from hook execution.
 */
export interface HookResult {
  /** Whether the hook execution succeeded */
  success: boolean;
  /** Hook output */
  output?: string;
  /** Exit code (for command hooks) */
  exitCode?: number;
  /** Whether the hook blocked the operation */
  blocked?: boolean;
  /** Reason for blocking */
  blockReason?: string;
  /** Execution duration in ms */
  durationMs?: number;
}
