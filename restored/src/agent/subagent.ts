/**
 * Sub-Agent Mechanism — Foreground/Background Execution, Worktree Isolation,
 * Model Selection, and Teammate Restrictions
 *
 * Reverse-engineered from claude_code_agent.js v2.1.83
 * Build: 2026-03-25T05:15:24Z
 *
 * Obfuscated name mapping:
 *   T9       → AGENT_TOOL_NAME = "Agent" (pos 858407)
 *   fh_      → selectSubagentModel (model selection function, pos 1655636)
 *   T27      → MODEL_KEYWORD_MAP (model keyword mapping, pos 1655542)
 *   q27      → modelMatchesKeyword (check if model matches keyword)
 *   B46      → translateCrossProvider (cross-provider model translation)
 *   Ib       → getModelByPermissionMode (model based on permission mode)
 *   tJ8      → countWorktrees (count git worktrees, pos 838844)
 *   GR       → isTeammate (check if running as teammate)
 *   TNT      → SAFETY_MONITOR_PROMPT (security monitoring prompt, pos 1658699)
 *   wb       → TASK_STOP_TOOL_NAME = "TaskStop"
 *   Ep9      → createAgentGenerator (async generator wrapper, pos 1824749)
 *
 * Source confidence:
 *   [CONFIRMED] — Directly extracted from minified code
 *   [INFERRED]  — Reconstructed from call sites and data flow
 *   [SPECULATIVE] — Reasonable guess based on patterns
 */

// ============================================================================
// Constants [CONFIRMED]
// ============================================================================

/**
 * Tool name for the Agent tool.
 * Obfuscated: T9 (pos 858407)
 * [CONFIRMED] — `T9 = "Agent"` at pos 858407
 */
export const AGENT_TOOL_NAME = 'Agent';

/**
 * Tool name for the TaskStop tool.
 * Obfuscated: wb
 * [CONFIRMED] — used for stopping background agents
 */
export const TASK_STOP_TOOL_NAME = 'TaskStop';

/**
 * Supported model keywords for sub-agent model selection.
 * Obfuscated: T27 (pos 1655542)
 *
 * [CONFIRMED] — from model selection logic at pos 1655636 (fh_)
 */
export const MODEL_KEYWORDS = ['opus', 'sonnet', 'haiku', 'inherit'] as const;
export type ModelKeyword = (typeof MODEL_KEYWORDS)[number];

/**
 * Agent tool prompt description.
 * [CONFIRMED] — from pos 1651330
 */
export const AGENT_TOOL_DESCRIPTION = `Launch a new agent to handle complex, multi-step tasks autonomously. The Agent tool launches specialized agents (subprocesses) that autonomously handle complex tasks.`;

/**
 * Background agent guidance (from prompt).
 * [CONFIRMED] — from agent prompt at pos 1651330
 */
export const BACKGROUND_AGENT_GUIDANCE = `When an agent runs in the background, you will be automatically notified when it completes — do NOT sleep, poll, or proactively check on its progress.`;

// ============================================================================
// Sub-Agent Input Types [CONFIRMED]
// ============================================================================

/**
 * Execution mode for the sub-agent.
 *
 * [CONFIRMED] — foreground is default, background is opt-in
 */
export type SubagentExecutionMode = 'foreground' | 'background';

/**
 * Isolation mode for the sub-agent.
 *
 * [CONFIRMED] — "worktree" creates a git worktree; default runs in same cwd
 */
export type SubagentIsolation = 'none' | 'worktree';

/**
 * Input schema for the Agent tool.
 *
 * [CONFIRMED] — from tool input schema and prompt description
 */
export interface AgentToolInput {
  /** The task/prompt for the sub-agent */
  prompt: string;

  /**
   * Model preference keyword.
   * [CONFIRMED] — supports: opus, sonnet, haiku, inherit
   */
  model?: ModelKeyword;

  /**
   * Whether to run in the background.
   * [CONFIRMED] — `run_in_background: true` enables background mode
   */
  run_in_background?: boolean;

  /**
   * Isolation mode.
   * [CONFIRMED] — "worktree" creates git worktree isolation
   */
  isolation?: SubagentIsolation;

  /**
   * Directories to symlink into worktree (to avoid disk bloat).
   * [CONFIRMED] — from worktree isolation feature
   */
  symlinkDirectories?: string[];

  /**
   * Sub-agent name (unavailable when running as teammate).
   * [CONFIRMED] — from teammate restriction at pos 1655331
   */
  name?: string;

  /**
   * Team name (unavailable when running as teammate).
   * [CONFIRMED]
   */
  team_name?: string;

  /**
   * Mode override (unavailable when running as teammate).
   * [CONFIRMED]
   */
  mode?: string;
}

// ============================================================================
// Sub-Agent Result Types [CONFIRMED]
// ============================================================================

/**
 * Result from a foreground sub-agent execution.
 *
 * [CONFIRMED] — result is returned as a single message to the parent agent
 * [CONFIRMED] — "The result returned by the agent is not visible to the user."
 */
export interface SubagentResult {
  /** Whether the sub-agent completed successfully */
  success: boolean;

  /** The sub-agent's output/result text */
  output: string;

  /** Duration in ms */
  durationMs: number;

  /** Token usage from the sub-agent */
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_read_input_tokens: number;
    cache_creation_input_tokens: number;
  };

  /** Cost in USD */
  costUsd: number;

  /** Number of conversation turns */
  numTurns: number;

  /**
   * For worktree isolation: the worktree path and branch.
   * [CONFIRMED] — returned when isolation="worktree" and changes were made
   */
  worktree?: {
    path: string;
    branch: string;
    hasChanges: boolean;
  };
}

/**
 * Background agent handle for tracking.
 *
 * [CONFIRMED] — background agents complete asynchronously and notify parent
 */
export interface BackgroundAgentHandle {
  /** Unique ID for this background agent */
  agentId: string;

  /** The task prompt */
  prompt: string;

  /** The agent name (if provided) */
  name?: string;

  /** Promise that resolves when the agent completes */
  completion: Promise<SubagentResult>;

  /** Abort controller to stop the background agent */
  abortController: AbortController;
}

// ============================================================================
// Model Selection [CONFIRMED, pos 1655636]
// ============================================================================

/**
 * Selects the model for a sub-agent.
 * Obfuscated: fh_() (pos 1655636)
 *
 * [CONFIRMED] — model selection priority from analysis:
 *
 * Priority order:
 * 1. CLAUDE_CODE_SUBAGENT_MODEL env var (highest)
 * 2. Explicit tool input parameter (opus/sonnet/haiku/inherit)
 * 3. Agent definition's model configuration
 * 4. "inherit" default → Ib() selects based on permissionMode
 *
 * @param inputModel - Model keyword from tool input
 * @param parentModel - The parent agent's current model
 * @param permissionMode - Current permission mode
 * @param provider - Current API provider
 * @returns The resolved model string
 */
export function selectSubagentModel(
  inputModel: ModelKeyword | undefined,
  parentModel: string,
  permissionMode: string,
  provider: string,
): string {
  // [CONFIRMED] Priority 1: Environment variable override
  const envModel = process.env.CLAUDE_CODE_SUBAGENT_MODEL;
  if (envModel) {
    return envModel;
  }

  // [CONFIRMED] Priority 2: Explicit input keyword
  if (inputModel && inputModel !== 'inherit') {
    const resolved = resolveModelKeyword(inputModel, provider);
    if (resolved) return resolved;
  }

  // [CONFIRMED] Priority 3/4: Inherit from parent or select by permission mode
  if (!inputModel || inputModel === 'inherit') {
    return getModelByPermissionMode(permissionMode, parentModel, provider);
  }

  // Fallback to parent model
  return parentModel;
}

/**
 * Resolves a model keyword to a full model string.
 * Obfuscated: T27 mapping (pos 1655542)
 *
 * [CONFIRMED] — keywords map to current generation models
 */
function resolveModelKeyword(keyword: ModelKeyword, provider: string): string | null {
  // [CONFIRMED] Model keyword to full model name mapping
  const keywordMap: Record<string, string> = {
    opus: 'claude-opus-4-6',
    sonnet: 'claude-sonnet-4-6',
    haiku: 'claude-haiku-4-5',
  };

  const model = keywordMap[keyword];
  if (!model) return null;

  // [CONFIRMED] Cross-provider translation if needed
  return translateCrossProvider(model, provider);
}

/**
 * Checks if a model string matches a keyword.
 * Obfuscated: q27()
 *
 * [CONFIRMED] — used to check if parent model matches the requested keyword
 */
export function modelMatchesKeyword(model: string, keyword: ModelKeyword): boolean {
  const lower = model.toLowerCase();
  switch (keyword) {
    case 'opus':
      return lower.includes('opus');
    case 'sonnet':
      return lower.includes('sonnet');
    case 'haiku':
      return lower.includes('haiku');
    case 'inherit':
      return true; // Inherit matches any model
    default:
      return false;
  }
}

/**
 * Selects a model based on permission mode.
 * Obfuscated: Ib()
 *
 * [INFERRED] — different permission modes may prefer different model tiers
 *
 * - auto mode: may use Sonnet for classification + Haiku for fast tasks
 * - plan mode: may use a lighter model since it's read-only
 * - default: inherits parent model
 */
function getModelByPermissionMode(
  permissionMode: string,
  parentModel: string,
  provider: string,
): string {
  // [INFERRED] Most modes inherit the parent model
  // The actual implementation may have mode-specific overrides
  return parentModel;
}

/**
 * Translates a model identifier across providers.
 * Obfuscated: B46()
 *
 * [CONFIRMED] — handles cases where main model is on one provider
 * but sub-agent needs a different model on another provider
 *
 * Example: main on Bedrock with claude-sonnet-4-6, sub-agent wants
 * opus → needs Bedrock-specific opus identifier
 */
export function translateCrossProvider(model: string, provider: string): string {
  // [CONFIRMED] firstParty uses standard model names
  if (provider === 'firstParty') return model;

  // [INFERRED] Bedrock uses different naming convention
  if (provider === 'bedrock') {
    // Bedrock model IDs use different format
    // e.g., "anthropic.claude-sonnet-4-6-20260101-v1:0"
    // [SPECULATIVE] — exact mapping behind M() closure
    return model; // Stub — actual translation is provider-specific
  }

  // [CONFIRMED] Vertex uses region-specific deployment
  if (provider === 'vertex') {
    return model; // Model name stays same, region changes
  }

  // [INFERRED] Foundry may have its own naming
  if (provider === 'foundry') {
    return model;
  }

  return model;
}

// ============================================================================
// Worktree Isolation [CONFIRMED]
// ============================================================================

/**
 * Git worktree configuration for isolated sub-agent execution.
 *
 * [CONFIRMED] — from worktree isolation feature:
 *   - Creates isolated copy of the repository
 *   - Sub-agent operates on its own branch
 *   - No changes → auto-cleanup
 *   - Has changes → returns path and branch
 *   - symlinkDirectories avoids disk bloat
 */
export interface WorktreeConfig {
  /** Base repository path */
  repoPath: string;

  /** Branch name for the worktree */
  branchName: string;

  /** Worktree path (auto-generated) */
  worktreePath: string;

  /** Directories to symlink instead of copying */
  symlinkDirectories: string[];
}

/**
 * Counts existing git worktrees.
 * Obfuscated: tJ8() (pos 838844)
 *
 * [CONFIRMED] — counts entries in .git/worktrees/ directory
 */
export async function countWorktrees(repoPath: string): Promise<number> {
  const fs = await import('fs/promises');
  const path = await import('path');

  const worktreesDir = path.join(repoPath, '.git', 'worktrees');

  try {
    const entries = await fs.readdir(worktreesDir);
    return entries.length;
  } catch {
    return 0; // No worktrees directory
  }
}

/**
 * Creates a git worktree for isolated sub-agent execution.
 *
 * [CONFIRMED] — isolation: "worktree" creates a git worktree
 * [CONFIRMED] — triggers WorktreeCreate hook event
 *
 * @param repoPath - Path to the git repository
 * @param symlinkDirs - Directories to symlink
 * @returns WorktreeConfig for the created worktree
 */
export async function createWorktree(
  repoPath: string,
  symlinkDirs: string[] = [],
): Promise<WorktreeConfig> {
  const path = await import('path');
  const { execFile } = await import('child_process');
  const { promisify } = await import('util');
  const execFileAsync = promisify(execFile);

  const branchName = `claude-subagent-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const worktreePath = path.join(repoPath, '.git', 'worktrees-claude', branchName);

  // [CONFIRMED] Create worktree with new branch
  await execFileAsync('git', ['worktree', 'add', '-b', branchName, worktreePath], {
    cwd: repoPath,
  });

  // [CONFIRMED] symlink directories to avoid disk bloat
  const fs = await import('fs/promises');
  for (const dir of symlinkDirs) {
    const srcPath = path.join(repoPath, dir);
    const destPath = path.join(worktreePath, dir);

    try {
      // Remove the copied directory and replace with symlink
      await fs.rm(destPath, { recursive: true, force: true });
      await fs.symlink(srcPath, destPath, 'dir');
    } catch {
      // Symlink failure is non-fatal
    }
  }

  return {
    repoPath,
    branchName,
    worktreePath,
    symlinkDirectories: symlinkDirs,
  };
}

/**
 * Cleans up a git worktree after sub-agent completion.
 *
 * [CONFIRMED] — no changes → auto-cleanup
 * [CONFIRMED] — has changes → keep worktree, return path and branch
 * [CONFIRMED] — triggers WorktreeRemove hook event
 *
 * @param config - Worktree configuration
 * @returns Whether the worktree had changes (true = kept, false = removed)
 */
export async function cleanupWorktree(
  config: WorktreeConfig,
): Promise<{ hasChanges: boolean; branch: string; path: string }> {
  const { execFile } = await import('child_process');
  const { promisify } = await import('util');
  const execFileAsync = promisify(execFile);

  // [CONFIRMED] Check if there are uncommitted or committed changes
  try {
    const { stdout: statusOutput } = await execFileAsync(
      'git',
      ['status', '--porcelain'],
      { cwd: config.worktreePath },
    );

    const { stdout: diffOutput } = await execFileAsync(
      'git',
      ['diff', 'HEAD~1', '--stat'],
      { cwd: config.worktreePath },
    ).catch(() => ({ stdout: '' }));

    const hasChanges = statusOutput.trim().length > 0 || diffOutput.trim().length > 0;

    if (!hasChanges) {
      // [CONFIRMED] No changes → auto-cleanup
      await execFileAsync('git', ['worktree', 'remove', config.worktreePath, '--force'], {
        cwd: config.repoPath,
      });
      await execFileAsync('git', ['branch', '-D', config.branchName], {
        cwd: config.repoPath,
      }).catch(() => {}); // Branch deletion may fail if already cleaned
    }

    return {
      hasChanges,
      branch: config.branchName,
      path: config.worktreePath,
    };
  } catch {
    // Cleanup failed — leave worktree in place
    return {
      hasChanges: true,
      branch: config.branchName,
      path: config.worktreePath,
    };
  }
}

// ============================================================================
// Teammate Restrictions [CONFIRMED, pos 1655331]
// ============================================================================

/**
 * Checks if the current agent is running as a teammate.
 * Obfuscated: GR()
 *
 * [CONFIRMED] — from teammate restriction logic at pos 1655331
 *
 * When running as a teammate:
 * - run_in_background, name, team_name, mode parameters are NOT available
 * - Teammate cannot spawn other teammates
 * - Only synchronous sub-agents are supported
 */
export function isTeammate(): boolean {
  // [CONFIRMED] — GR() checks a flag in the global state or agent config
  // The exact flag name is behind M() closure
  //
  // [INFERRED] — likely checks ZT or agent config for teammate status
  return false; // Stub — actual implementation reads from global state
}

/**
 * Validates Agent tool input against teammate restrictions.
 *
 * [CONFIRMED] — from pos 1655331:
 *   When as teammate: run_in_background, name, team_name, mode unavailable
 *   Teammate cannot spawn other teammates
 *
 * @param input - The agent tool input
 * @returns Validation result with error message if invalid
 */
export function validateTeammateRestrictions(
  input: AgentToolInput,
): { valid: boolean; error?: string } {
  if (!isTeammate()) {
    return { valid: true };
  }

  // [CONFIRMED] Restricted parameters
  if (input.run_in_background) {
    return {
      valid: false,
      error: 'Teammates cannot run sub-agents in the background',
    };
  }

  if (input.name) {
    return {
      valid: false,
      error: 'Teammates cannot specify agent names',
    };
  }

  if (input.team_name) {
    return {
      valid: false,
      error: 'Teammates cannot specify team names',
    };
  }

  if (input.mode) {
    return {
      valid: false,
      error: 'Teammates cannot override execution mode',
    };
  }

  return { valid: true };
}

// ============================================================================
// Security Classification [CONFIRMED, pos 1666596]
// ============================================================================

/**
 * Security monitor prompt for Agent tool (Tengu classifier).
 * Obfuscated: TNT (pos 1658699)
 *
 * [CONFIRMED] — Tengu classifier performs special handling for Agent tool:
 *   "carefully examine the `prompt` field. If the prompt instructs the
 *    sub-agent to perform ANY action from the BLOCK list, block the
 *    Agent call itself."
 *
 * The classifier inspects the Agent tool's `prompt` parameter to detect
 * whether the sub-agent would be asked to perform blocked operations.
 */
export const SAFETY_CLASSIFICATION_RULES = {
  /**
   * [CONFIRMED] — the prompt field is the primary inspection target
   */
  inspectFields: ['prompt'],

  /**
   * [CONFIRMED] — sub-agent operations inherit security constraints
   */
  inheritParentConstraints: true,

  /**
   * [CONFIRMED] — block the Agent call itself if sub-agent would perform blocked ops
   */
  blockOnSubagentViolation: true,
} as const;

/**
 * Extracts classifier-relevant input from an Agent tool call.
 *
 * [CONFIRMED] — from pos 1666596 security check:
 *   The classifier examines the prompt field of Agent tool calls
 *
 * @param input - Agent tool input
 * @returns Extracted fields for the Tengu classifier
 */
export function extractClassifierInput(input: AgentToolInput): {
  prompt: string;
  model?: string;
  isBackground: boolean;
  hasWorktreeIsolation: boolean;
} {
  return {
    prompt: input.prompt,
    model: input.model,
    isBackground: input.run_in_background ?? false,
    hasWorktreeIsolation: input.isolation === 'worktree',
  };
}

// ============================================================================
// Sub-Agent Communication [CONFIRMED]
// ============================================================================

/**
 * Sub-agent communication mode.
 *
 * [CONFIRMED] — sub-agent starts fresh (no context inheritance by default)
 * [CONFIRMED] — "fork" mode inherits complete conversation context
 */
export type SubagentCommunicationMode = 'fresh' | 'fork';

/**
 * Configuration for launching a sub-agent.
 *
 * [CONFIRMED/INFERRED] — reconstructed from Ep9() and Agent tool implementation
 */
export interface SubagentLaunchConfig {
  /** Task prompt */
  prompt: string;

  /** Resolved model string */
  model: string;

  /** Working directory */
  cwd: string;

  /** Execution mode */
  executionMode: SubagentExecutionMode;

  /** Communication mode */
  communicationMode: SubagentCommunicationMode;

  /** Worktree config if isolation is enabled */
  worktree?: WorktreeConfig;

  /** Maximum turns for the sub-agent */
  maxTurns?: number;

  /** Maximum budget in USD */
  maxBudgetUsd?: number;

  /** Available tools (subset of parent's tools) */
  tools: any[]; // Tool[] from the tool system

  /** Agent ID for hook context */
  agentId: string;

  /** Agent type for hook context */
  agentType: string;
}

// ============================================================================
// Sub-Agent Executor [CONFIRMED/INFERRED]
// ============================================================================

/**
 * Launches a foreground sub-agent and waits for completion.
 *
 * [CONFIRMED] — foreground is the default execution mode
 * [CONFIRMED] — result is returned as a single message to the parent agent
 * [CONFIRMED] — "The result returned by the agent is not visible to the user."
 *   → parent agent must explicitly forward relevant results
 *
 * @param config - Sub-agent launch configuration
 * @returns Sub-agent result
 */
export async function launchForegroundSubagent(
  config: SubagentLaunchConfig,
): Promise<SubagentResult> {
  const startTime = Date.now();

  // [CONFIRMED] Sub-agent uses the same Ep9() → Sp9 infrastructure
  // It creates a new agent instance with its own:
  //   - mutableMessages (fresh or forked)
  //   - abortController
  //   - permissionDenials
  //   - totalUsage

  // [INFERRED] The actual execution delegates to createAgentGenerator (Ep9)
  // with the sub-agent's configuration

  try {
    // Stub: actual implementation calls Ep9() with sub-agent config
    // and collects all events into a result
    const result = await executeSubagentLoop(config);

    return {
      success: true,
      output: result.output,
      durationMs: Date.now() - startTime,
      usage: result.usage,
      costUsd: result.costUsd,
      numTurns: result.numTurns,
      worktree: config.worktree
        ? {
            path: config.worktree.worktreePath,
            branch: config.worktree.branchName,
            hasChanges: false, // Updated by cleanup
          }
        : undefined,
    };
  } catch (error: any) {
    return {
      success: false,
      output: `Sub-agent error: ${error.message}`,
      durationMs: Date.now() - startTime,
      usage: { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
      costUsd: 0,
      numTurns: 0,
    };
  }
}

/**
 * Launches a background sub-agent.
 *
 * [CONFIRMED] — background agents run concurrently
 * [CONFIRMED] — completion auto-notifies the parent agent
 * [CONFIRMED] — can be stopped via TaskStop tool
 *
 * @param config - Sub-agent launch configuration
 * @returns Handle for tracking the background agent
 */
export function launchBackgroundSubagent(
  config: SubagentLaunchConfig,
): BackgroundAgentHandle {
  const abortController = new AbortController();

  const completion = (async (): Promise<SubagentResult> => {
    const startTime = Date.now();

    try {
      const result = await executeSubagentLoop({
        ...config,
        // [INFERRED] Background agents may have their own abort controller
      });

      return {
        success: true,
        output: result.output,
        durationMs: Date.now() - startTime,
        usage: result.usage,
        costUsd: result.costUsd,
        numTurns: result.numTurns,
        worktree: config.worktree
          ? {
              path: config.worktree.worktreePath,
              branch: config.worktree.branchName,
              hasChanges: false,
            }
          : undefined,
      };
    } catch (error: any) {
      return {
        success: false,
        output: `Background agent error: ${error.message}`,
        durationMs: Date.now() - startTime,
        usage: { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
        costUsd: 0,
        numTurns: 0,
      };
    }
  })();

  return {
    agentId: config.agentId,
    prompt: config.prompt,
    name: undefined, // Set by caller if provided
    completion,
    abortController,
  };
}

/**
 * Internal: executes the sub-agent conversation loop.
 *
 * [INFERRED] — delegates to Ep9() (createAgentGenerator) with sub-agent config
 * [SPECULATIVE] — exact parameter mapping is behind M() closure
 */
async function executeSubagentLoop(config: SubagentLaunchConfig): Promise<{
  output: string;
  usage: { input_tokens: number; output_tokens: number; cache_read_input_tokens: number; cache_creation_input_tokens: number };
  costUsd: number;
  numTurns: number;
}> {
  // In the actual code, this function:
  // 1. Creates a new Sp9 agent instance
  // 2. Configures it with the sub-agent's tools, model, cwd
  // 3. Calls Ep9() to get an async generator
  // 4. Iterates through all events, collecting the final result
  // 5. Returns the aggregated output and usage
  //
  // [SPECULATIVE] — the exact implementation is within M() closure
  throw new Error(
    'executeSubagentLoop: stub — actual implementation delegates to Ep9/Sp9 infrastructure',
  );
}

// ============================================================================
// Agent Tool Implementation [CONFIRMED/INFERRED]
// ============================================================================

/**
 * The Agent tool's call() implementation.
 *
 * [CONFIRMED] — from tool execution pipeline and Agent tool structure
 * [INFERRED] — full flow reconstructed from multiple call sites
 *
 * Flow:
 * 1. Validate teammate restrictions
 * 2. Resolve model (fh_ / selectSubagentModel)
 * 3. If isolation="worktree", create worktree
 * 4. Build sub-agent config
 * 5. Launch foreground or background agent
 * 6. If worktree, cleanup and report changes
 * 7. Return result to parent agent
 */
export async function agentToolCall(
  input: AgentToolInput,
  context: {
    cwd: string;
    parentModel: string;
    permissionMode: string;
    provider: string;
    tools: any[];
    agentId: string;
  },
): Promise<string> {
  // Step 1: Validate teammate restrictions [CONFIRMED]
  const validation = validateTeammateRestrictions(input);
  if (!validation.valid) {
    return `Error: ${validation.error}`;
  }

  // Step 2: Resolve model [CONFIRMED]
  const model = selectSubagentModel(
    input.model,
    context.parentModel,
    context.permissionMode,
    context.provider,
  );

  // Step 3: Create worktree if needed [CONFIRMED]
  let worktree: WorktreeConfig | undefined;
  if (input.isolation === 'worktree') {
    try {
      worktree = await createWorktree(context.cwd, input.symlinkDirectories ?? []);
    } catch (error: any) {
      return `Error creating worktree: ${error.message}`;
    }
  }

  const cwd = worktree?.worktreePath ?? context.cwd;

  // Step 4: Build launch config [INFERRED]
  const agentId = `subagent_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const launchConfig: SubagentLaunchConfig = {
    prompt: input.prompt,
    model,
    cwd,
    executionMode: input.run_in_background ? 'background' : 'foreground',
    communicationMode: 'fresh', // Default: fresh context
    worktree,
    tools: context.tools,
    agentId,
    agentType: 'subagent',
  };

  // Step 5: Launch [CONFIRMED]
  if (input.run_in_background) {
    const handle = launchBackgroundSubagent(launchConfig);
    // [CONFIRMED] Background agent returns immediately with a handle
    // The parent agent is notified when it completes
    return `Background agent launched (id: ${handle.agentId}). You will be automatically notified when it completes.`;
  }

  // Foreground execution
  const result = await launchForegroundSubagent(launchConfig);

  // Step 6: Cleanup worktree if needed [CONFIRMED]
  if (worktree) {
    const worktreeResult = await cleanupWorktree(worktree);
    if (worktreeResult.hasChanges) {
      result.worktree = {
        path: worktreeResult.path,
        branch: worktreeResult.branch,
        hasChanges: true,
      };
    }
  }

  // Step 7: Return result [CONFIRMED]
  if (!result.success) {
    return `Agent failed: ${result.output}`;
  }

  let response = result.output;
  if (result.worktree?.hasChanges) {
    response += `\n\n[Worktree: ${result.worktree.branch} at ${result.worktree.path}]`;
  }

  return response;
}
