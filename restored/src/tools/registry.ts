/**
 * Tool Registry — Complete Rewrite Based on Actual Tool System
 *
 * Reverse-engineered from claude_code_agent.js v2.1.83
 *
 * Obfuscated name mapping:
 *   RK       → findToolByName (tool lookup, used in MCP handler pos 1880934)
 *   Zy_      → filterToolsByPermissionMode (pos 1841027)
 *   Uw       → deduplicateByName (pos 1841027)
 *   QB       → buildPermissionContext (pos 1841027)
 *   go_      → filterMcpTools (pos 1833077)
 *   rP       → getToolPermissionContext (MCP handler)
 *   tJ       → transformTools (MCP handler)
 *   mQ       → CORE_TOOL_NAMES (core tool name array)
 *   MAH      → EXTENDED_TOOL_NAMES [...mQ, "Tmux", wb]
 *   wb       → TASK_STOP_NAME = "TaskStop"
 *   A6q      → PERMISSION_CATEGORIES (pos 862704)
 *   np9      → getCanUseToolFn (exported permission function selector)
 *   TP       → defaultPermissionChecker (phantom, M() closure)
 *   ip9      → createCanUseToolWithPermissionPrompt (MCP wrapper)
 *
 * Source confidence:
 *   [CONFIRMED] — Directly extracted from minified code
 *   [INFERRED]  — Reconstructed from call sites
 */

import type {
  Tool,
  ToolContext,
  ToolPermissionContext,
  CanUseToolFunction,
  McpClient,
  PermissionMode,
  ValidationResult,
  Message,
} from '../agent/Agent';

// ============================================================================
// Tool Name Constants [CONFIRMED]
// ============================================================================

/**
 * Core built-in tool names.
 * Obfuscated: mQ
 * [CONFIRMED] — extracted via string analysis
 */
export const CORE_TOOL_NAMES = [
  'Bash',
  'Read',
  'Write',
  'Edit',
  'Glob',
  'Grep',
  'Agent',
  'WebSearch',
  'WebFetch',
  'NotebookEdit',
  'NotebookRead',
  'TodoWrite',
] as const;

/**
 * Extended tool names including Tmux and TaskStop.
 * Obfuscated: MAH = [...mQ, "Tmux", wb]  where wb = "TaskStop"
 * [CONFIRMED]
 */
export const EXTENDED_TOOL_NAMES = [
  ...CORE_TOOL_NAMES,
  'Tmux',
  'TaskStop',
] as const;

export type ToolName = (typeof EXTENDED_TOOL_NAMES)[number];

// ============================================================================
// Permission Categories [CONFIRMED, pos 862704]
// ============================================================================

/**
 * Permission validation categories.
 * Obfuscated: A6q (module Kk8, pos 862704)
 * [CONFIRMED] — directly extracted
 */
export const PERMISSION_CATEGORIES = {
  /**
   * Tools that use file glob pattern matching for permissions.
   * Example rules: "Read(src/**/*.ts)", "Edit(src/**)", "Write(*)"
   */
  filePatternTools: [
    'Read', 'Write', 'Edit', 'Glob', 'NotebookRead', 'NotebookEdit',
  ] as string[],

  /**
   * Tools that use command prefix matching for permissions.
   * Example rules: "Bash(npm run *)", "Bash(git *)"
   */
  bashPrefixTools: [
    'Bash',
  ] as string[],

  /**
   * Tools with custom validation functions.
   * Each function validates the tool input against specific rules.
   */
  customValidation: {
    /**
     * WebSearch validation [CONFIRMED, pos 862807]
     * Rejects wildcards (*, ?) in search queries
     */
    WebSearch: (input: Record<string, unknown>): ValidationResult => {
      const query = (input.query as string) || '';
      if (query.includes('*') || query.includes('?')) {
        return { valid: false, message: 'Search queries cannot contain wildcards' };
      }
      return { valid: true };
    },

    /**
     * WebFetch validation [CONFIRMED, pos 863057]
     * Enforces domain:hostname format, rejects wildcards in domains
     */
    WebFetch: (input: Record<string, unknown>): ValidationResult => {
      const url = (input.url as string) || '';
      try {
        const hostname = new URL(url).hostname;
        if (hostname.includes('*')) {
          return { valid: false, message: 'Wildcards not allowed in domain names' };
        }
      } catch {
        return { valid: false, message: 'Invalid URL' };
      }
      return { valid: true };
    },
  } as Record<string, (input: Record<string, unknown>) => ValidationResult>,
};

// ============================================================================
// Tool Lookup [CONFIRMED]
// ============================================================================

/**
 * Find a tool by name in the tool array.
 * Obfuscated: RK (used in MCP handler at pos 1880934)
 * [CONFIRMED] — call pattern: RK(tools, name) → Tool | undefined
 */
export function findToolByName(tools: Tool[], name: string): Tool | undefined {
  return tools.find(t => t.name === name);
}

// ============================================================================
// Tool Array Construction [CONFIRMED, pos 1841027]
// ============================================================================

/**
 * Build the tool permission context for filtering.
 * Obfuscated: QB (pos 1841027)
 *
 * [CONFIRMED] — called as: let E_ = QB(N_.toolPermissionContext, N_.mcp.tools)
 */
export function buildPermissionContext(
  permContext: ToolPermissionContext,
  mcpTools: Tool[]
): ToolPermissionContext {
  // [INFERRED] Merges MCP tool permissions with existing context
  return {
    ...permContext,
    // MCP tools may have their own permission configurations
  };
}

/**
 * Filter tools based on the current permission mode.
 * Obfuscated: Zy_ (pos 1841027)
 *
 * [CONFIRMED] — called as: Zy_([...K,...p,...Q.tools], E_, N_.toolPermissionContext.mode)
 *
 * In 'plan' mode, removes write/execute tools.
 * In other modes, applies mode-specific filtering.
 */
export function filterToolsByPermissionMode(
  tools: Tool[],
  permContext: ToolPermissionContext,
  mode: PermissionMode
): Tool[] {
  switch (mode) {
    case 'plan':
      // [INFERRED] Plan mode: only read-only tools
      return tools.filter(tool => {
        // Read-only tools are always allowed in plan mode
        if (tool.isReadOnly()) return true;
        // Tools with no side effects
        if (tool.name === 'TodoWrite') return true;
        return false;
      });

    case 'bypassPermissions':
      // [CONFIRMED] All tools available
      return [...tools];

    case 'dontAsk':
      // [INFERRED] All tools available but denied at permission check
      return [...tools];

    default:
      // [CONFIRMED] default, acceptEdits, auto: all tools available
      return [...tools];
  }
}

/**
 * Deduplicate tools by name (built-in tools take precedence).
 * Obfuscated: Uw (pos 1841027)
 *
 * [CONFIRMED] — called as: Uw(filteredTools, "name")
 * When there are duplicate names, the first occurrence (built-in) wins.
 */
export function deduplicateByName(tools: Tool[], key: string = 'name'): Tool[] {
  const seen = new Set<string>();
  const result: Tool[] = [];

  for (const tool of tools) {
    const name = (tool as Record<string, unknown>)[key] as string;
    if (!seen.has(name)) {
      seen.add(name);
      result.push(tool);
    }
  }

  return result;
}

/**
 * Filter MCP tools by permission context.
 * Obfuscated: go_ (pos 1833077)
 *
 * [CONFIRMED] — called as: let k = go_(z.mcp.tools, z.toolPermissionContext)
 */
export function filterMcpTools(
  mcpTools: Tool[],
  permContext: ToolPermissionContext
): Tool[] {
  return mcpTools.filter(tool => {
    // [INFERRED] Check if tool is allowed by permission context
    return tool.isEnabled();
  });
}

// ============================================================================
// Complete Tool Array Assembly [CONFIRMED, pos 1841027]
// ============================================================================

/**
 * Assemble the final tool array from all sources.
 *
 * [CONFIRMED] — actual code:
 * ```javascript
 * let E_ = QB(N_.toolPermissionContext, N_.mcp.tools);
 * let b_ = Uw(Zy_([...K,...p,...Q.tools], E_, N_.toolPermissionContext.mode), "name");
 * ```
 *
 * Pipeline:
 *   Built-in (K/$) + MCP (p/k) + SDK (Q.tools)
 *     → QB() build permission context
 *     → Zy_() filter by permission mode
 *     → Uw() deduplicate by name (built-in first)
 *     → Final tool array
 */
export function assembleToolArray(
  builtinTools: Tool[],
  mcpTools: Tool[],
  sdkTools: Tool[],
  permContext: ToolPermissionContext
): Tool[] {
  // Step 1: Build permission context with MCP tools
  const enrichedContext = buildPermissionContext(permContext, mcpTools);

  // Step 2: Merge all tools (built-in first for dedup priority)
  const allTools = [...builtinTools, ...mcpTools, ...sdkTools];

  // Step 3: Filter by permission mode
  const filtered = filterToolsByPermissionMode(allTools, enrichedContext, permContext.mode);

  // Step 4: Deduplicate by name (built-in tools win)
  return deduplicateByName(filtered, 'name');
}

// ============================================================================
// canUseTool Function Selector [CONFIRMED]
// ============================================================================

/**
 * Select the appropriate canUseTool permission function.
 * Obfuscated: np9 (exported as getCanUseToolFn via ep9 module)
 *
 * [CONFIRMED] — code structure extracted:
 * ```javascript
 * function np9(permissionPromptToolName, handler, getMcpTools, onRequiresAction) {
 *   if (permissionPromptToolName === "stdio")
 *     return handler.createCanUseTool(onRequiresAction);
 *   if (!permissionPromptToolName)
 *     return TP;  // Default permission checker
 *   return async (tool, input, context, history, toolUseId) => {
 *     // MCP permission prompt tool wrapper
 *   };
 * }
 * ```
 */
export function getCanUseToolFn(
  permissionPromptToolName: string | null | undefined,
  handler: {
    createCanUseTool: (onRequiresAction: () => void) => CanUseToolFunction;
  },
  getMcpTools: () => Tool[],
  onRequiresAction: () => void
): CanUseToolFunction {
  // Case 1: SDK stdio mode
  if (permissionPromptToolName === 'stdio') {
    return handler.createCanUseTool(onRequiresAction);
  }

  // Case 2: No permission prompt tool → use default checker
  if (!permissionPromptToolName) {
    return defaultPermissionChecker;
  }

  // Case 3: MCP permission prompt tool
  // [CONFIRMED] ip9 wraps an MCP tool as a permission prompt
  // It calls TP first, and if result is uncertain, delegates to MCP tool
  return createCanUseToolWithPermissionPrompt(
    permissionPromptToolName,
    getMcpTools,
    onRequiresAction
  );
}

/**
 * Default built-in permission checker.
 * Obfuscated: TP (phantom, set via M() closure)
 *
 * [INFERRED] — TP implements core allow/deny rule matching
 * This is the function that evaluates permission rules like:
 *   "Read(*)", "Bash(npm run *)", "Edit(src/**)"
 */
export const defaultPermissionChecker: CanUseToolFunction = async (
  tool: Tool,
  input: Record<string, unknown>,
  context: ToolContext,
  _history: Message[],
  _toolUseId: string
): Promise<'allow' | 'deny' | 'ask'> => {
  const { mode, allowRules, denyRules } = context.toolPermissionContext;

  // [CONFIRMED] bypassPermissions mode: always allow
  if (mode === 'bypassPermissions') {
    return 'allow';
  }

  // [CONFIRMED] plan mode: only read-only tools allowed
  if (mode === 'plan') {
    if (tool.isReadOnly(input)) return 'allow';
    return 'deny';
  }

  // [CONFIRMED] dontAsk mode: never prompt, deny if would need approval
  if (mode === 'dontAsk') {
    if (tool.isReadOnly(input)) return 'allow';
    if (matchesAnyRule(tool, input, allowRules)) return 'allow';
    return 'deny';
  }

  // [CONFIRMED] Check deny rules first
  if (matchesAnyRule(tool, input, denyRules)) {
    return 'deny';
  }

  // [CONFIRMED] Check allow rules
  if (matchesAnyRule(tool, input, allowRules)) {
    return 'allow';
  }

  // [CONFIRMED] Read-only tools are generally allowed
  if (tool.isReadOnly(input)) {
    return 'allow';
  }

  // [CONFIRMED] acceptEdits mode: auto-accept file edits
  if (mode === 'acceptEdits') {
    const isFileEdit = PERMISSION_CATEGORIES.filePatternTools.includes(tool.name);
    if (isFileEdit) return 'allow';
  }

  // Default: ask the user
  return 'ask';
};

/**
 * Create a canUseTool function that wraps an MCP permission prompt tool.
 * Obfuscated: ip9 (createCanUseToolWithPermissionPrompt)
 *
 * [CONFIRMED] — ip9 calls TP first, then if uncertain, invokes MCP tool
 */
function createCanUseToolWithPermissionPrompt(
  permissionPromptToolName: string,
  getMcpTools: () => Tool[],
  _onRequiresAction: () => void
): CanUseToolFunction {
  return async (
    tool: Tool,
    input: Record<string, unknown>,
    context: ToolContext,
    history: Message[],
    toolUseId: string
  ): Promise<'allow' | 'deny' | 'ask'> => {
    // Step 1: Run default checker first
    const defaultResult = await defaultPermissionChecker(
      tool, input, context, history, toolUseId
    );

    // If clearly allow or deny, use that result
    if (defaultResult === 'allow' || defaultResult === 'deny') {
      return defaultResult;
    }

    // Step 2: Delegate to MCP permission prompt tool
    const mcpTools = getMcpTools();
    const promptTool = findToolByName(mcpTools, permissionPromptToolName);
    if (!promptTool) {
      return 'ask'; // Fallback if MCP tool not found
    }

    // [INFERRED] Call MCP tool to get permission decision
    try {
      const result = await promptTool.call(
        { tool_name: tool.name, input },
        context,
        defaultPermissionChecker,
        { addText: () => {}, addImage: () => {}, build: () => ({} as any) }
      );
      // Parse MCP tool result to allow/deny/ask
      if (typeof result === 'string') {
        if (result.toLowerCase().includes('allow')) return 'allow';
        if (result.toLowerCase().includes('deny')) return 'deny';
      }
      return 'ask';
    } catch {
      return 'ask';
    }
  };
}

// ============================================================================
// Rule Matching [INFERRED]
// ============================================================================

/**
 * Check if a tool call matches any permission rule.
 * [INFERRED] — reconstructed from permission category analysis
 *
 * Rule format:
 *   "ToolName(pattern)" — e.g., "Read(*)", "Bash(npm run *)", "Edit(src/**)"
 */
function matchesAnyRule(
  tool: Tool,
  input: Record<string, unknown>,
  rules: string[]
): boolean {
  for (const rule of rules) {
    if (matchesRule(tool, input, rule)) return true;
  }
  return false;
}

/**
 * Match a single permission rule.
 * [INFERRED] — based on PERMISSION_CATEGORIES
 */
function matchesRule(
  tool: Tool,
  input: Record<string, unknown>,
  rule: string
): boolean {
  // Parse rule format: "ToolName(pattern)"
  const match = rule.match(/^(\w+)\((.+)\)$/);
  if (!match) return false;

  const [, ruleTool, pattern] = match;
  if (ruleTool !== tool.name) return false;

  // Match based on tool category
  if (PERMISSION_CATEGORIES.filePatternTools.includes(tool.name)) {
    return matchFilePattern(input, pattern);
  }

  if (PERMISSION_CATEGORIES.bashPrefixTools.includes(tool.name)) {
    return matchBashPrefix(input, pattern);
  }

  // Custom validation tools handled separately
  return false;
}

/**
 * Match file path against a glob pattern.
 * [INFERRED] — filePatternTools use glob matching
 */
function matchFilePattern(
  input: Record<string, unknown>,
  pattern: string
): boolean {
  const filePath = (input.path || input.file_path || '') as string;

  // Simple glob matching (* = any)
  if (pattern === '*') return true;

  // Convert glob to regex
  const regexStr = pattern
    .replace(/\*\*/g, '{{DOUBLESTAR}}')
    .replace(/\*/g, '[^/]*')
    .replace(/\{\{DOUBLESTAR\}\}/g, '.*')
    .replace(/\?/g, '.');

  try {
    const regex = new RegExp(`^${regexStr}$`);
    return regex.test(filePath);
  } catch {
    return false;
  }
}

/**
 * Match command against a bash prefix pattern.
 * [INFERRED] — bashPrefixTools use prefix matching
 */
function matchBashPrefix(
  input: Record<string, unknown>,
  pattern: string
): boolean {
  const command = (input.command || '') as string;

  // Simple prefix matching with * wildcard
  if (pattern === '*') return true;

  if (pattern.endsWith('*')) {
    const prefix = pattern.slice(0, -1);
    return command.startsWith(prefix);
  }

  return command === pattern;
}

// ============================================================================
// Tool Execution Pipeline [CONFIRMED]
// ============================================================================

/**
 * Execute a tool call through the full pipeline.
 *
 * [CONFIRMED] Pipeline from analysis:
 * 1. API tool_use → RK(tools, name)
 * 2. validateInput
 * 3. canUseTool permission check
 * 4. PreToolUse Hook
 * 5. tool.call()
 * 6. PostToolUse / PostToolUseFailure Hook
 * 7. Build tool_result
 */
export async function executeToolCall(
  tools: Tool[],
  toolUseBlock: {
    id: string;
    name: string;
    input: Record<string, unknown>;
  },
  context: ToolContext,
  canUseTool: CanUseToolFunction,
  history: Message[],
  hooks?: {
    preToolUse?: (toolName: string, input: Record<string, unknown>) => Promise<boolean>;
    postToolUse?: (toolName: string, result: unknown) => Promise<void>;
    postToolUseFailure?: (toolName: string, error: unknown) => Promise<void>;
  }
): Promise<{
  type: 'tool_result';
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}> {
  const { id, name, input } = toolUseBlock;

  // Step 1: Find tool [CONFIRMED]
  const tool = findToolByName(tools, name);
  if (!tool) {
    return {
      type: 'tool_result',
      tool_use_id: id,
      content: `Error: Tool "${name}" not found`,
      is_error: true,
    };
  }

  // Step 2: Check enabled [CONFIRMED]
  if (!tool.isEnabled()) {
    return {
      type: 'tool_result',
      tool_use_id: id,
      content: `Error: Tool "${name}" is currently disabled`,
      is_error: true,
    };
  }

  // Step 3: Validate input [CONFIRMED]
  if (tool.validateInput) {
    const validation = await tool.validateInput(input, context);
    if (!validation.valid) {
      return {
        type: 'tool_result',
        tool_use_id: id,
        content: `Validation error: ${validation.message}`,
        is_error: true,
      };
    }
  }

  // Step 4: Permission check [CONFIRMED]
  const permission = await canUseTool(tool, input, context, history, id);
  if (permission === 'deny') {
    return {
      type: 'tool_result',
      tool_use_id: id,
      content: `Permission denied for tool "${name}"`,
      is_error: true,
    };
  }

  // Step 5: PreToolUse hook [CONFIRMED]
  if (hooks?.preToolUse) {
    const shouldProceed = await hooks.preToolUse(name, input);
    if (!shouldProceed) {
      return {
        type: 'tool_result',
        tool_use_id: id,
        content: `Blocked by PreToolUse hook`,
        is_error: true,
      };
    }
  }

  // Step 6: Execute tool [CONFIRMED]
  try {
    const builder = createToolResultBuilder();
    const result = await tool.call(input, context, canUseTool, builder);

    // Step 7: PostToolUse hook [CONFIRMED]
    if (hooks?.postToolUse) {
      await hooks.postToolUse(name, result);
    }

    const content = typeof result === 'string' ? result : JSON.stringify(result);
    return {
      type: 'tool_result',
      tool_use_id: id,
      content,
    };
  } catch (error) {
    // PostToolUseFailure hook [CONFIRMED]
    if (hooks?.postToolUseFailure) {
      await hooks.postToolUseFailure(name, error);
    }

    return {
      type: 'tool_result',
      tool_use_id: id,
      content: `Error: ${error instanceof Error ? error.message : String(error)}`,
      is_error: true,
    };
  }
}

/**
 * Create a ToolResultBuilder.
 * [INFERRED] — based on tool.call() signature
 */
function createToolResultBuilder() {
  const parts: Array<{ type: string; text?: string; data?: string; mimeType?: string }> = [];
  return {
    addText(text: string) {
      parts.push({ type: 'text', text });
    },
    addImage(data: string, mimeType: string) {
      parts.push({ type: 'image', data, mimeType });
    },
    build() {
      return { parts };
    },
  };
}
