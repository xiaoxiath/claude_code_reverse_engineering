/**
 * Permission Manager — Complete Rewrite Based on 6 Permission Modes
 *
 * Reverse-engineered from claude_code_agent.js v2.1.83
 *
 * Obfuscated name mapping:
 *   zb_      → PERMISSION_MODES definition (pos 857240)
 *   iD       → PERMISSION_MODE_METADATA (pos 857678)
 *   L4T      → EXTERNAL_MODES (5 modes, no auto)
 *   Q28      → INTERNAL_MODES (6 modes, includes auto)
 *   mM       → ALL_MODES = Q28
 *   A6q      → PERMISSION_CATEGORIES (pos 862704, module Kk8)
 *   ONT      → tenguClassifier (auto-mode, pos 1694777, module fl_)
 *   TNT      → SECURITY_MONITOR_PROMPT (pos 1658699)
 *   h27      → extractClassifierInput
 *   Z27      → buildInputSummary
 *   b7$      → buildConversationTranscript
 *   TP       → defaultPermissionChecker (phantom, M() closure)
 *   np9      → getCanUseToolFn (permission function selector)
 *   ip9      → createCanUseToolWithPermissionPrompt
 *
 * Source confidence:
 *   [CONFIRMED] — Directly extracted from minified code
 *   [INFERRED]  — Reconstructed from call sites
 *   [SPECULATIVE] — Reasonable implementation guess
 */

import type {
  Tool,
  ToolContext,
  PermissionMode,
  CanUseToolFunction,
  Message,
  TokenUsage,
} from '../agent/Agent';

// ============================================================================
// Permission Mode Definitions [CONFIRMED, pos 857240]
// ============================================================================

/**
 * Permission mode metadata.
 * Obfuscated: zb_ (pos 857240) and iD (pos 857678)
 * [CONFIRMED]
 */
export interface PermissionModeConfig {
  name: PermissionMode;
  title: string;
  symbol: string;
  color: string;
  description: string;
}

/**
 * All 6 permission modes with metadata.
 * [CONFIRMED] — extracted from pos 857240 and 857678
 */
export const PERMISSION_MODES: Record<PermissionMode, PermissionModeConfig> = {
  default: {
    name: 'default',
    title: 'Default',
    symbol: '',
    color: 'text',
    description: 'Standard mode — asks user for each sensitive operation',
  },
  plan: {
    name: 'plan',
    title: 'Plan',
    symbol: '\u23F8', // ⏸
    color: 'planMode',
    description: 'Plan mode — read-only, no writes or executions',
  },
  acceptEdits: {
    name: 'acceptEdits',
    title: 'Accept Edits',
    symbol: '\u23F5\u23F5', // ⏵⏵
    color: 'autoAccept',
    description: 'Auto-accepts file edits, still asks for bash commands',
  },
  bypassPermissions: {
    name: 'bypassPermissions',
    title: 'Bypass Permissions',
    symbol: '\u23F5\u23F5', // ⏵⏵
    color: 'error',
    description: 'Bypasses all permission checks — dangerous!',
  },
  dontAsk: {
    name: 'dontAsk',
    title: "Don't Ask",
    symbol: '\u23F5\u23F5', // ⏵⏵
    color: 'error',
    description: 'Never prompts user, denies anything that would require approval',
  },
  auto: {
    name: 'auto',
    title: 'Auto',
    symbol: '\u23F5\u23F5', // ⏵⏵
    color: 'warning',
    description: 'AI-based classifier (tengu) decides whether to allow or block',
  },
};

/**
 * External modes (visible to users, no auto).
 * Obfuscated: L4T
 * [CONFIRMED]
 */
export const EXTERNAL_MODES: PermissionMode[] = [
  'acceptEdits', 'bypassPermissions', 'default', 'dontAsk', 'plan',
];

/**
 * Internal modes (includes auto).
 * Obfuscated: Q28 = [...L4T, "auto"]
 * [CONFIRMED]
 */
export const INTERNAL_MODES: PermissionMode[] = [...EXTERNAL_MODES, 'auto'];

/**
 * All modes.
 * Obfuscated: mM = Q28
 * [CONFIRMED]
 */
export const ALL_MODES = INTERNAL_MODES;

// ============================================================================
// Permission Rule System [CONFIRMED]
// ============================================================================

/**
 * Permission rule configuration.
 * [CONFIRMED] — from settings validation schema
 */
export interface PermissionRules {
  allow: string[];   // e.g., ["Read(*)", "Bash(npm run *)"]
  deny: string[];    // e.g., ["Bash(rm -rf *)", "Edit(/.env)"]
  defaultMode: PermissionMode;
  additionalDirectories?: string[];
}

/**
 * Permission check result.
 * [CONFIRMED] — from canUseTool return types
 */
export type PermissionBehavior = 'allow' | 'deny' | 'ask';

/**
 * Permission validation categories.
 * Obfuscated: A6q (module Kk8, pos 862704)
 * [CONFIRMED] — directly extracted
 */
export const PERMISSION_CATEGORIES = {
  /** File glob pattern matching: "Read(src/**)" */
  filePatternTools: ['Read', 'Write', 'Edit', 'Glob', 'NotebookRead', 'NotebookEdit'],

  /** Command prefix matching: "Bash(npm run *)" */
  bashPrefixTools: ['Bash'],

  /** Tool-specific custom validation */
  customValidation: ['WebSearch', 'WebFetch'],
} as const;

// ============================================================================
// Permission Manager Class
// ============================================================================

/**
 * Manages permission checking for tool execution.
 *
 * This class implements the real permission system found in the Claude Code
 * binary, including 6 permission modes, rule matching, and the tengu classifier
 * integration for auto mode.
 *
 * [CONFIRMED] Core logic extracted from reverse analysis
 */
export class PermissionManager {
  private rules: PermissionRules;
  private mode: PermissionMode;
  private sessionBypass: boolean = false;

  constructor(rules: PermissionRules) {
    this.rules = rules;
    this.mode = rules.defaultMode || 'default';
  }

  /**
   * Get current permission mode.
   * [CONFIRMED]
   */
  getMode(): PermissionMode {
    if (this.sessionBypass) return 'bypassPermissions';
    return this.mode;
  }

  /**
   * Set permission mode.
   * [CONFIRMED] — linked to ZT.sessionBypassPermissionsMode
   */
  setMode(mode: PermissionMode): void {
    this.mode = mode;
  }

  /**
   * Enable session-level bypass.
   * [CONFIRMED] — ZT.sessionBypassPermissionsMode
   */
  setSessionBypass(enabled: boolean): void {
    this.sessionBypass = enabled;
  }

  /**
   * Check if a tool use is permitted.
   *
   * [CONFIRMED] Flow:
   * 1. Check mode (bypass → allow, plan → read-only only)
   * 2. Check deny rules
   * 3. Check allow rules
   * 4. Check tool properties (isReadOnly)
   * 5. Mode-specific handling (acceptEdits, dontAsk)
   * 6. Auto mode → tengu classifier
   * 7. Default → ask
   */
  async checkPermission(
    tool: Tool,
    input: Record<string, unknown>,
    context?: {
      messages?: Message[];
      tenguClassifier?: TenguClassifier;
    }
  ): Promise<PermissionBehavior> {
    const mode = this.getMode();

    // [CONFIRMED] bypassPermissions: always allow
    if (mode === 'bypassPermissions') {
      return 'allow';
    }

    // [CONFIRMED] plan mode: only read-only
    if (mode === 'plan') {
      return tool.isReadOnly(input) ? 'allow' : 'deny';
    }

    // [CONFIRMED] Check deny rules first
    if (this.matchesRules(tool, input, this.rules.deny)) {
      return 'deny';
    }

    // [CONFIRMED] Check allow rules
    if (this.matchesRules(tool, input, this.rules.allow)) {
      return 'allow';
    }

    // [CONFIRMED] Read-only tools generally allowed
    if (tool.isReadOnly(input)) {
      return 'allow';
    }

    // [CONFIRMED] dontAsk: deny anything that would need approval
    if (mode === 'dontAsk') {
      return 'deny';
    }

    // [CONFIRMED] acceptEdits: auto-accept file pattern tools
    if (mode === 'acceptEdits') {
      if (PERMISSION_CATEGORIES.filePatternTools.includes(tool.name)) {
        return 'allow';
      }
    }

    // [CONFIRMED] auto mode: use tengu classifier
    if (mode === 'auto' && context?.tenguClassifier) {
      const result = await context.tenguClassifier.classify(
        tool,
        input,
        context.messages || []
      );
      return result.shouldBlock ? 'deny' : 'allow';
    }

    // Default: ask user
    return 'ask';
  }

  /**
   * Match tool+input against a set of permission rules.
   * [INFERRED] — based on rule format analysis
   */
  private matchesRules(
    tool: Tool,
    input: Record<string, unknown>,
    rules: string[]
  ): boolean {
    for (const rule of rules) {
      if (this.matchRule(tool, input, rule)) return true;
    }
    return false;
  }

  /**
   * Match a single permission rule.
   *
   * Rule format: "ToolName(pattern)"
   * - File tools: "Read(src/**)", "Write(*)", "Edit(src/*.ts)"
   * - Bash tools: "Bash(npm run *)", "Bash(git *)"
   * - Web tools: "WebFetch(domain:github.com)"
   *
   * [INFERRED] — from permission category analysis
   */
  private matchRule(
    tool: Tool,
    input: Record<string, unknown>,
    rule: string
  ): boolean {
    const match = rule.match(/^(\w+)\((.+)\)$/);
    if (!match) return false;

    const [, ruleTool, pattern] = match;
    if (ruleTool !== tool.name) return false;

    // Route to appropriate matcher based on tool category
    if (PERMISSION_CATEGORIES.filePatternTools.includes(tool.name)) {
      return this.matchFilePattern(input, pattern);
    }

    if (PERMISSION_CATEGORIES.bashPrefixTools.includes(tool.name)) {
      return this.matchBashPrefix(input, pattern);
    }

    if (tool.name === 'WebFetch') {
      return this.matchWebFetch(input, pattern);
    }

    return false;
  }

  /**
   * Match file path against glob pattern.
   * [INFERRED] — filePatternTools use glob matching
   */
  private matchFilePattern(input: Record<string, unknown>, pattern: string): boolean {
    const filePath = (input.path || input.file_path || '') as string;
    if (pattern === '*') return true;

    const regexStr = pattern
      .replace(/\*\*/g, '{{DOUBLESTAR}}')
      .replace(/\*/g, '[^/]*')
      .replace(/\{\{DOUBLESTAR\}\}/g, '.*')
      .replace(/\?/g, '.');

    try {
      return new RegExp(`^${regexStr}$`).test(filePath);
    } catch {
      return false;
    }
  }

  /**
   * Match command against prefix pattern.
   * [INFERRED] — bashPrefixTools use prefix matching
   */
  private matchBashPrefix(input: Record<string, unknown>, pattern: string): boolean {
    const command = (input.command || '') as string;
    if (pattern === '*') return true;
    if (pattern.endsWith('*')) {
      return command.startsWith(pattern.slice(0, -1));
    }
    return command === pattern;
  }

  /**
   * Match WebFetch domain pattern.
   * [CONFIRMED, pos 863057] — enforces domain: prefix
   */
  private matchWebFetch(input: Record<string, unknown>, pattern: string): boolean {
    const url = (input.url || '') as string;
    if (!pattern.startsWith('domain:')) return false;
    const domain = pattern.slice('domain:'.length);

    try {
      const hostname = new URL(url).hostname;
      if (domain === '*') return true;
      return hostname === domain || hostname.endsWith(`.${domain}`);
    } catch {
      return false;
    }
  }
}

// ============================================================================
// Tengu Auto-Mode Classifier [CONFIRMED, pos 1694777]
// ============================================================================

/**
 * Tengu classification result.
 * [CONFIRMED] — from ONT() return type
 */
export interface TenguResult {
  shouldBlock: boolean;
  reason: string;
  model: string;
  usage: TokenUsage;
  stage: 1 | 2;
}

/**
 * Tengu auto-mode classifier interface.
 * Obfuscated: ONT (module fl_, pos 1694777)
 *
 * [CONFIRMED] — Two-stage AI safety classifier:
 * 1. Stage 1 (fast): Quick yes/no with security monitor prompt
 * 2. Stage 2 (full): Deep analysis if Stage 1 uncertain
 *
 * Flow:
 * 1. h27() — extract classifier-relevant input from tool args
 * 2. Z27() — build input summary
 * 3. If empty → allow (no classifier-relevant input)
 * 4. b7$() — build conversation transcript
 * 5. Estimate token count → choose strategy
 * 6. Stage 1: Fast classifier (API + TNT security prompt)
 * 7. Stage 2: Full assessment if Stage 1 uncertain
 * 8. Return {shouldBlock, reason, model, usage, stage}
 */
export interface TenguClassifier {
  classify(
    tool: Tool,
    input: Record<string, unknown>,
    messages: Message[]
  ): Promise<TenguResult>;
}

/**
 * Implementation of the Tengu classifier.
 * [INFERRED] — based on ONT() analysis
 */
export class TenguClassifierImpl implements TenguClassifier {
  private securityPrompt: string;
  private apiClient: {
    createMessage(params: Record<string, unknown>): Promise<{
      content: Array<{ text?: string }>;
      usage: TokenUsage;
    }>;
  };

  constructor(
    securityPrompt: string,
    apiClient: TenguClassifierImpl['apiClient']
  ) {
    this.securityPrompt = securityPrompt;
    this.apiClient = apiClient;
  }

  async classify(
    tool: Tool,
    input: Record<string, unknown>,
    messages: Message[]
  ): Promise<TenguResult> {
    // Step 1: Extract classifier-relevant input [CONFIRMED] h27()
    const classifierInput = this.extractClassifierInput(tool, input);

    // Step 2: Build input summary [CONFIRMED] Z27()
    const summary = this.buildInputSummary(classifierInput);

    // Step 3: If no relevant input, allow [CONFIRMED]
    if (!summary) {
      return {
        shouldBlock: false,
        reason: 'No classifier-relevant input',
        model: '',
        usage: { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
        stage: 1,
      };
    }

    // Step 4: Build conversation transcript [CONFIRMED] b7$()
    const transcript = this.buildConversationTranscript(messages);

    // Step 5-6: Stage 1 — Fast classifier [CONFIRMED]
    try {
      const stage1Result = await this.runStage1(tool, summary, transcript);
      if (stage1Result !== null) {
        return stage1Result;
      }
    } catch {
      // Stage 1 failed, proceed to Stage 2
    }

    // Step 7: Stage 2 — Full assessment [CONFIRMED]
    return this.runStage2(tool, summary, transcript);
  }

  /**
   * Extract classifier-relevant input from tool args.
   * Obfuscated: h27
   * [INFERRED]
   */
  private extractClassifierInput(
    tool: Tool,
    input: Record<string, unknown>
  ): Record<string, unknown> {
    // For Agent tool: include the prompt field (critical for security)
    // [CONFIRMED, pos 1666596] — tengu checks Agent's prompt field
    if (tool.name === 'Agent') {
      return { prompt: input.prompt, tool_name: tool.name };
    }

    // For Bash: include command
    if (tool.name === 'Bash') {
      return { command: input.command, tool_name: tool.name };
    }

    // For file tools: include path
    if (['Write', 'Edit'].includes(tool.name)) {
      return { path: input.path, tool_name: tool.name };
    }

    return { tool_name: tool.name, ...input };
  }

  /**
   * Build a summary of the input for the classifier.
   * Obfuscated: Z27
   * [INFERRED]
   */
  private buildInputSummary(input: Record<string, unknown>): string | null {
    const parts: string[] = [];
    for (const [key, value] of Object.entries(input)) {
      if (value !== undefined && value !== null && value !== '') {
        parts.push(`${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`);
      }
    }
    return parts.length > 0 ? parts.join('\n') : null;
  }

  /**
   * Build a conversation transcript for context.
   * Obfuscated: b7$
   * [INFERRED]
   */
  private buildConversationTranscript(messages: Message[]): string {
    return messages
      .slice(-10)  // Last 10 messages for context
      .map(m => `${m.role}: ${typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}`)
      .join('\n');
  }

  /**
   * Stage 1: Fast classifier.
   * [CONFIRMED] — API call with security monitor prompt (TNT)
   */
  private async runStage1(
    tool: Tool,
    summary: string,
    transcript: string
  ): Promise<TenguResult | null> {
    try {
      const response = await this.apiClient.createMessage({
        model: 'claude-haiku-4-5',
        max_tokens: 100,
        system: this.securityPrompt,
        messages: [{
          role: 'user',
          content: `Tool: ${tool.name}\nInput: ${summary}\n\nConversation context:\n${transcript}\n\nShould this tool call be allowed? Answer YES or NO with brief reason.`,
        }],
      });

      const text = response.content[0]?.text?.toLowerCase() || '';
      if (text.includes('yes')) {
        return {
          shouldBlock: false,
          reason: 'Stage 1: Allowed',
          model: 'claude-haiku-4-5',
          usage: response.usage,
          stage: 1,
        };
      }
      if (text.includes('no')) {
        return {
          shouldBlock: true,
          reason: response.content[0]?.text || 'Stage 1: Blocked',
          model: 'claude-haiku-4-5',
          usage: response.usage,
          stage: 1,
        };
      }

      // Uncertain — fall through to Stage 2
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Stage 2: Full assessment.
   * [CONFIRMED] — deeper analysis with full context
   */
  private async runStage2(
    tool: Tool,
    summary: string,
    transcript: string
  ): Promise<TenguResult> {
    try {
      const response = await this.apiClient.createMessage({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        system: this.securityPrompt,
        messages: [{
          role: 'user',
          content: `Detailed security assessment required.\n\nTool: ${tool.name}\nInput: ${summary}\n\nFull conversation:\n${transcript}\n\nAnalyze: 1) Does this match user intent? 2) Could it be destructive? 3) Could it exfiltrate data? Answer ALLOW or BLOCK with detailed reasoning.`,
        }],
      });

      const text = response.content[0]?.text?.toLowerCase() || '';
      const shouldBlock = text.includes('block');

      return {
        shouldBlock,
        reason: response.content[0]?.text || (shouldBlock ? 'Stage 2: Blocked' : 'Stage 2: Allowed'),
        model: 'claude-sonnet-4-6',
        usage: response.usage,
        stage: 2,
      };
    } catch (error) {
      // On failure, default to blocking for safety
      return {
        shouldBlock: true,
        reason: `Classifier error: ${error instanceof Error ? error.message : String(error)}`,
        model: 'unknown',
        usage: { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
        stage: 2,
      };
    }
  }
}
