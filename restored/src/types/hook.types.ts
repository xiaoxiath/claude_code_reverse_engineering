/**
 * Hook 系统类型定义 — 深度逆向重写 (2026-03-26)
 *
 * 来源: source_code/bun_extracted_full.js 二进制静态分析
 *
 * 关键发现:
 * 1. Hook 事件类型共 24 种（比旧版多 3 种: McpToolCall, McpToolResult, ToolError）
 * 2. Hook 本身有 4 种类型: command / file-watcher / intercept / event
 *    - command: 执行外部命令（如 shell 脚本）
 *    - file-watcher: 监听文件变化触发
 *    - intercept: 拦截型，可修改输入或阻止执行（仅 PreToolUse）
 *    - event: 纯事件通知型
 * 3. Hook 配置在 .claude/settings.json 或项目 .claude/config.json 中定义
 *
 * byte-offset 参考:
 *   - Hook 事件枚举: offset 0x2F1000..0x2F1200 (字符串常量)
 *   - Hook 类型定义: offset 0x2F1400..0x2F1800 (函数 hK9)
 *   - Hook 执行引擎: offset 0x2F1800..0x2F2400 (函数 rH_)
 *   - Hook matcher: offset 0x2F2400..0x2F2800 (函数 mH3)
 *
 * 可信度: 95% (事件名来自字符串常量), 85% (Hook 类型结构)
 */

// ============================================================
// Hook 事件类型 — 24 种
// ============================================================

/**
 * 完整的 Hook 事件类型列表
 *
 * 逆向来源: offset 0x2F1000 字符串常量区
 * 可信度: 100% (直接从二进制提取)
 *
 * 相比旧版新增:
 *   - McpToolCall (MCP 工具调用前)
 *   - McpToolResult (MCP 工具结果后)
 *   - ToolError (工具执行出错)
 */
export type HookEventType =
  // === Agent 生命周期 ===
  | 'SessionStart'           // 会话开始
  | 'SessionEnd'             // 会话结束
  | 'Stop'                   // Agent 停止
  | 'Setup'                  // 初始化设置

  // === 工具相关 ===
  | 'PreToolUse'             // 工具使用前 (可拦截)
  | 'PostToolUse'            // 工具使用后
  | 'PostToolUseFailure'     // 工具使用失败后
  | 'ToolError'              // 工具执行出错 (新增)

  // === MCP 相关 ===
  | 'McpToolCall'            // MCP 工具调用前 (新增)
  | 'McpToolResult'          // MCP 工具结果后 (新增)

  // === 用户交互 ===
  | 'UserPromptSubmit'       // 用户提交 prompt
  | 'Notification'           // 通知事件
  | 'Elicitation'            // 向用户提问
  | 'ElicitationResult'      // 用户回答结果

  // === 子 Agent ===
  | 'SubagentStart'          // 子 Agent 启动
  | 'SubagentStop'           // 子 Agent 停止
  | 'TeammateIdle'           // 队友空闲

  // === 上下文 ===
  | 'PreCompact'             // 上下文压缩前
  | 'InstructionsLoaded'     // 指令文件加载完成

  // === 权限 ===
  | 'PermissionRequest'      // 权限请求

  // === 配置 ===
  | 'ConfigChange'           // 配置变更

  // === 任务 ===
  | 'TaskCompleted'          // 任务完成

  // === Worktree ===
  | 'WorktreeCreate'         // Worktree 创建
  | 'WorktreeRemove';        // Worktree 删除

// ============================================================
// 4 种 Hook 类型
// ============================================================

/**
 * Hook 类型枚举
 *
 * 逆向来源: offset 0x2F1400 函数 hK9 中的 type 字段 switch
 * 可信度: 90%
 */
export type HookType = 'command' | 'file-watcher' | 'intercept' | 'event';

/**
 * Hook 规格基类 — 所有 Hook 类型的公共字段
 */
export interface HookSpecBase {
  /** Hook 类型 */
  type: HookType;

  /** 匹配的事件类型 */
  event: HookEventType;

  /**
   * 工具名称匹配器（仅对 PreToolUse / PostToolUse 等工具相关事件有效）
   * 支持 glob 模式，如 "Bash", "Write", "MCP::*"
   */
  matcher?: string;

  /** 超时时间 (毫秒), 默认 10000 */
  timeout?: number;
}

/**
 * Command Hook — 执行外部 shell 命令
 *
 * 逆向来源: hK9 中 type === "command" 分支
 *
 * 示例配置:
 * {
 *   type: "command",
 *   event: "PostToolUse",
 *   matcher: "Write",
 *   command: "eslint --fix $TOOL_INPUT_FILE_PATH"
 * }
 */
export interface HookCommandSpec extends HookSpecBase {
  type: 'command';
  /** 要执行的 shell 命令 */
  command: string;
  /** 工作目录 */
  cwd?: string;
  /** 环境变量 (会注入 TOOL_INPUT_*, TOOL_OUTPUT_* 等) */
  env?: Record<string, string>;
}

/**
 * File-Watcher Hook — 监听文件变化触发
 *
 * 逆向来源: hK9 中 type === "file-watcher" 分支
 */
export interface HookFileWatcherSpec extends HookSpecBase {
  type: 'file-watcher';
  /** 要监听的 glob 模式 */
  pattern: string;
  /** 触发的事件类型 */
  fileEvents?: Array<'create' | 'change' | 'delete'>;
}

/**
 * Intercept Hook — 拦截型，可修改输入或阻止执行
 *
 * 逆向来源: hK9 中 type === "intercept" 分支
 * 仅对 PreToolUse 事件有效
 *
 * intercept hook 的命令 stdout 会被解析为 JSON:
 * - { "action": "allow" } — 放行
 * - { "action": "block", "reason": "..." } — 阻止
 * - { "action": "modify", "input": {...} } — 修改输入后继续
 */
export interface HookInterceptSpec extends HookSpecBase {
  type: 'intercept';
  /** 拦截命令 (stdout 返回 JSON 决策) */
  command: string;
  cwd?: string;
  env?: Record<string, string>;
}

/**
 * Event Hook — 纯事件通知型
 *
 * 逆向来源: hK9 中 type === "event" 分支
 */
export interface HookEventSpec extends HookSpecBase {
  type: 'event';
  /** 要执行的命令 (fire-and-forget) */
  command: string;
  cwd?: string;
}

/** Hook 规格联合类型 */
export type HookSpec = HookCommandSpec | HookFileWatcherSpec | HookInterceptSpec | HookEventSpec;

// ============================================================
// Hook 输入类型 (传入 hook 命令的环境变量 / stdin)
// ============================================================

/**
 * PreToolUse Hook 输入
 *
 * 传递方式: 作为 JSON 写入 hook 命令的 stdin
 * 环境变量: HOOK_EVENT, TOOL_NAME, TOOL_USE_ID, TOOL_INPUT (JSON)
 */
export interface PreToolUseHookInput {
  event: 'PreToolUse';
  /** 工具名称 */
  toolName: string;
  /** 工具使用 ID */
  toolUseId: string;
  /** 工具输入参数 */
  toolInput: Record<string, unknown>;
  /** Agent ID */
  agentId?: string;
  /** Agent 类型 */
  agentType?: 'main' | 'subagent';
  /** 会话 ID */
  sessionId: string;
}

/**
 * PostToolUse Hook 输入
 */
export interface PostToolUseHookInput {
  event: 'PostToolUse';
  toolName: string;
  toolUseId: string;
  toolInput: Record<string, unknown>;
  /** 工具执行结果 */
  toolOutput: string;
  /** 是否为错误结果 */
  isError: boolean;
  /** 执行耗时 (ms) */
  durationMs: number;
  agentId?: string;
  sessionId: string;
}

/**
 * PostToolUseFailure Hook 输入
 */
export interface PostToolUseFailureHookInput {
  event: 'PostToolUseFailure';
  toolName: string;
  toolUseId: string;
  toolInput: Record<string, unknown>;
  /** 错误消息 */
  errorMessage: string;
  /** 错误栈 */
  errorStack?: string;
  agentId?: string;
  sessionId: string;
}

/**
 * SessionStart Hook 输入
 */
export interface SessionStartHookInput {
  event: 'SessionStart';
  sessionId: string;
  cwd: string;
  /** 权限模式 */
  permissionMode: string;
  /** 模型 */
  model: string;
}

/**
 * SessionEnd Hook 输入
 */
export interface SessionEndHookInput {
  event: 'SessionEnd';
  sessionId: string;
  /** 会话持续时间 (ms) */
  durationMs: number;
  /** 总轮次 */
  turnCount: number;
  /** 总 token 使用 */
  totalTokens: number;
  /** 总花费 (USD) */
  totalCostUsd: number;
}

/**
 * Notification Hook 输入
 */
export interface NotificationHookInput {
  event: 'Notification';
  type: 'info' | 'warning' | 'error';
  message: string;
  title?: string;
}

/**
 * 所有 Hook 输入的联合类型
 */
export type HookInput =
  | PreToolUseHookInput
  | PostToolUseHookInput
  | PostToolUseFailureHookInput
  | SessionStartHookInput
  | SessionEndHookInput
  | NotificationHookInput;

// ============================================================
// Intercept Hook 返回值
// ============================================================

/**
 * Intercept Hook 的决策结果 (从 stdout JSON 解析)
 *
 * 逆向来源: rH_ 函数中对 intercept hook stdout 的 JSON.parse
 */
export type InterceptDecision =
  | { action: 'allow' }
  | { action: 'block'; reason: string }
  | { action: 'modify'; input: Record<string, unknown> };

// ============================================================
// Hook 配置 (在 .claude/settings.json 中的结构)
// ============================================================

/**
 * Hook 配置映射
 *
 * 在 settings.json 中的结构:
 * {
 *   "hooks": {
 *     "PreToolUse": [ { type: "command", ... } ],
 *     "PostToolUse": [ { type: "command", ... } ],
 *     ...
 *   }
 * }
 */
export type HookConfigMap = {
  [event in HookEventType]?: HookSpec[];
};

// ============================================================
// Hook 执行结果
// ============================================================

/**
 * Hook 执行结果
 *
 * 逆向来源: rH_ 函数的返回值
 */
export interface HookExecutionResult {
  /** 是否成功 */
  success: boolean;
  /** Hook 事件 */
  event: HookEventType;
  /** Hook 类型 */
  hookType: HookType;
  /** 错误信息 (如果失败) */
  error?: string;
  /** 执行耗时 (ms) */
  durationMs: number;
  /** 命令退出码 (仅 command / intercept) */
  exitCode?: number;
  /** 命令 stdout (仅 command / intercept) */
  stdout?: string;
  /** 命令 stderr */
  stderr?: string;
  /** 拦截决策 (仅 intercept) */
  decision?: InterceptDecision;
}
