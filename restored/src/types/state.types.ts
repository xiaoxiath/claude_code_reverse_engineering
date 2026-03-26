/**
 * 全局状态类型定义 — 深度逆向重写 (2026-03-26)
 *
 * 来源: source_code/bun_extracted_full.js 二进制静态分析
 *
 * 关键发现:
 * Claude Code 使用一个名为 ZT 的全局状态单例管理整个应用状态。
 * ZT 包含 80+ 字段，按功能分为多个逻辑分区:
 *   - session: 会话状态 (ID, 消息, 轮次)
 *   - tool: 工具状态 (注册表, 执行中, 拒绝)
 *   - llm: LLM 状态 (模型, token 计数, 花费)
 *   - permission: 权限状态 (模式, 拒绝记录)
 *   - ui: UI 状态 (ink renderer 相关)
 *   - memory: 记忆状态 (CLAUDE.md, memory 文件)
 *   - mcp: MCP 状态 (服务器连接, 工具)
 *   - config: 配置状态 (层级配置, env)
 *
 * byte-offset 参考:
 *   - ZT 构造: offset 0x2C0000..0x2C0800 (函数 ZT)
 *   - ZT 字段初始化: offset 0x2C0800..0x2C1800
 *   - ZT 访问器: offset 0x2C1800..0x2C2000
 *
 * 可信度: 85% (字段名部分来自字符串常量, 部分来自属性访问模式推导)
 */

// ============================================================
// ZT 全局状态根类型
// ============================================================

/**
 * ZT — 全局状态单例
 *
 * 逆向来源: 混淆函数 ZT 的属性初始化列表
 * byte-offset: 0x2C0000
 *
 * 在代码中通过 getGlobalState() 或直接引用 ZT 实例访问。
 * 所有状态修改通过 ZT 的 setter 方法触发 UI 重渲染。
 */
export interface ZTGlobalState {
  // ============================================================
  // Session 分区 — 会话相关状态
  // ============================================================

  /** 当前会话 ID */
  sessionId: string;
  /** 会话消息列表 (内部格式, 非 API 格式) */
  messages: InternalMessage[];
  /** 当前轮次 */
  turnCount: number;
  /** 最大轮次限制 */
  maxTurns: number | undefined;
  /** 会话开始时间 */
  sessionStartTime: number;
  /** 会话是否活跃 */
  isSessionActive: boolean;
  /** 是否正在恢复会话 */
  isResuming: boolean;
  /** 恢复的会话 ID (--resume 参数) */
  resumeSessionId: string | null;
  /** 会话文件路径 */
  sessionFilePath: string;
  /** 上次 compact 的消息 UUID */
  lastCompactBoundaryUuid: string | null;

  // ============================================================
  // Tool 分区 — 工具相关状态
  // ============================================================

  /** 已注册工具名称列表 */
  registeredToolNames: string[];
  /** 当前正在执行的工具 */
  executingTools: Map<string, ExecutingToolInfo>;
  /** 待处理的工具使用 (等待权限) */
  pendingToolUses: PendingToolUse[];
  /** 权限拒绝的工具记录 */
  permissionDenials: PermissionDenialRecord[];
  /** 工具执行历史 (最近 N 条) */
  toolExecutionHistory: ToolExecutionRecord[];
  /** 工具使用摘要列表 */
  toolUseSummaries: ToolUseSummary[];

  // ============================================================
  // LLM 分区 — 模型相关状态
  // ============================================================

  /** 主循环模型名称 */
  mainLoopModel: string;
  /** 当前使用的模型 (可能因工具不同而切换) */
  currentModel: string;
  /** 总输入 token 数 */
  totalInputTokens: number;
  /** 总输出 token 数 */
  totalOutputTokens: number;
  /** 总缓存读取 token 数 */
  totalCacheReadTokens: number;
  /** 总缓存创建 token 数 */
  totalCacheCreationTokens: number;
  /** 总花费 (USD) */
  totalCostUsd: number;
  /** 最大预算 (USD) */
  maxBudgetUsd: number | undefined;
  /** 是否正在流式接收 */
  isStreaming: boolean;
  /** 当前流式请求 ID */
  currentStreamRequestId: string | null;
  /** API 重试计数 */
  apiRetryCount: number;
  /** 思考模式配置 */
  thinkingConfig: ThinkingConfig;
  /** API 端点 (Anthropic / Bedrock / Vertex) */
  apiProvider: 'anthropic' | 'bedrock' | 'vertex';

  // ============================================================
  // Permission 分区 — 权限相关状态
  // ============================================================

  /** 当前权限模式 */
  permissionMode: string;
  /** 会话级别的工具授权缓存 */
  sessionApprovals: Map<string, boolean>;
  /** 是否在非交互模式 */
  isNonInteractive: boolean;
  /** 权限策略列表 */
  permissionPolicies: PermissionPolicyRecord[];

  // ============================================================
  // UI 分区 — 界面相关状态
  // ============================================================

  /** 是否使用 TUI (terminal UI) */
  isTui: boolean;
  /** 是否为 JSON 输出模式 (--output-format json) */
  isJsonOutput: boolean;
  /** 是否为静默模式 */
  isSilent: boolean;
  /** 是否显示 spinner */
  showSpinner: boolean;
  /** 当前 spinner 文本 */
  spinnerText: string;
  /** 是否在 verbose 模式 */
  isVerbose: boolean;
  /** 终端宽度 */
  terminalWidth: number;
  /** 终端高度 */
  terminalHeight: number;
  /** 是否支持颜色 */
  supportsColor: boolean;

  // ============================================================
  // Memory 分区 — 记忆相关状态
  // ============================================================

  /** 全局 CLAUDE.md 内容 (~/.claude/CLAUDE.md) */
  globalInstructions: string | null;
  /** 项目 CLAUDE.md 内容 (.claude/CLAUDE.md 或 CLAUDE.md) */
  projectInstructions: string | null;
  /** 本地 CLAUDE.md 内容 (.claude.local/CLAUDE.md) */
  localInstructions: string | null;
  /** Memory 文件列表 */
  memoryFiles: MemoryFileRecord[];
  /** 指令是否已加载 */
  instructionsLoaded: boolean;

  // ============================================================
  // MCP 分区 — MCP 协议相关状态
  // ============================================================

  /** MCP 服务器连接状态 */
  mcpServers: Map<string, McpServerState>;
  /** MCP 工具列表 */
  mcpTools: McpToolRecord[];
  /** MCP 资源列表 */
  mcpResources: McpResourceRecord[];

  // ============================================================
  // Config 分区 — 配置相关状态
  // ============================================================

  /** 当前工作目录 */
  cwd: string;
  /** 项目根目录 (git root 或 cwd) */
  projectRoot: string;
  /** 是否在 git 仓库中 */
  isGitRepo: boolean;
  /** 配置文件路径 */
  configFilePath: string | null;
  /** 环境变量快照 */
  envSnapshot: Record<string, string | undefined>;

  // ============================================================
  // Agent 分区 — Agent 控制状态
  // ============================================================

  /** Agent ID */
  agentId: string;
  /** Agent 类型 */
  agentType: 'main' | 'subagent';
  /** 父 Agent ID (仅 subagent) */
  parentAgentId: string | null;
  /** 中止控制器 */
  abortController: AbortController;
  /** 是否已请求停止 */
  stopRequested: boolean;
  /** 停止原因 */
  stopReason: string | null;
  /** 查询来源 */
  querySource: string;
}

// ============================================================
// 分区子类型定义
// ============================================================

/**
 * 内部消息格式 — 与 Anthropic API 格式不同
 *
 * 逆向来源: ZT.messages 数组元素结构
 */
export interface InternalMessage {
  /** 消息类型 */
  type: 'user' | 'assistant' | 'system' | 'tool_use_summary' | 'progress' | 'attachment';
  /** API 格式的消息体 (仅 user / assistant) */
  message?: {
    role: 'user' | 'assistant';
    content: string | Array<Record<string, unknown>>;
    stop_reason?: string;
  };
  /** 唯一标识 */
  uuid: string;
  /** 时间戳 */
  timestamp: number;
  /** 是否为 meta 消息 (不发送给 LLM) */
  isMeta?: boolean;
  /** 子类型 (system 消息的子分类) */
  subtype?: string;
  /** compact 元数据 */
  compactMetadata?: CompactMetadata;
  /** 摘要 (tool_use_summary) */
  summary?: ToolUseSummary;
  /** 附件 (attachment) */
  attachment?: Record<string, unknown>;
}

/**
 * Compact 元数据
 */
export interface CompactMetadata {
  /** 保留的消息段 */
  preservedSegment: {
    headUuid: string;
    tailUuid: string;
  };
  /** 压缩比 */
  compressionRatio: number;
  /** 压缩前 token 数 */
  tokensBefore: number;
  /** 压缩后 token 数 */
  tokensAfter: number;
}

/**
 * 正在执行的工具信息
 */
export interface ExecutingToolInfo {
  toolName: string;
  toolUseId: string;
  startTime: number;
  input: Record<string, unknown>;
}

/**
 * 待处理的工具使用 (等待权限)
 */
export interface PendingToolUse {
  toolName: string;
  toolUseId: string;
  input: Record<string, unknown>;
  timestamp: number;
}

/**
 * 权限拒绝记录
 */
export interface PermissionDenialRecord {
  toolName: string;
  toolUseId: string;
  reason: string;
  message: string;
  timestamp: number;
}

/**
 * 工具执行记录
 */
export interface ToolExecutionRecord {
  toolName: string;
  toolUseId: string;
  startTime: number;
  endTime: number;
  durationMs: number;
  success: boolean;
  isError: boolean;
  resultLength: number;
}

/**
 * 工具使用摘要
 */
export interface ToolUseSummary {
  toolName: string;
  toolUseId: string;
  status: 'success' | 'error' | 'denied';
  precedingToolUseIds: string[];
}

/**
 * 思考模式配置
 */
export interface ThinkingConfig {
  type: 'adaptive' | 'enabled' | 'disabled';
  effort?: 'Low' | 'Medium' | 'High' | 'Max';
  budgetTokens?: number;
}

/**
 * 权限策略记录
 */
export interface PermissionPolicyRecord {
  id: string;
  name: string;
  source: 'remote' | 'enterprise' | 'local';
  deniedTools: string[];
  allowedTools: string[];
}

/**
 * Memory 文件记录
 */
export interface MemoryFileRecord {
  path: string;
  content: string;
  source: 'global' | 'project' | 'local';
  loadedAt: number;
}

/**
 * MCP 服务器状态
 */
export interface McpServerState {
  name: string;
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  transport: 'stdio' | 'sse' | 'streamable-http';
  toolCount: number;
  resourceCount: number;
  lastPing: number | null;
  error?: string;
}

/**
 * MCP 工具记录
 */
export interface McpToolRecord {
  name: string;
  serverName: string;
  description?: string;
  inputSchema: Record<string, unknown>;
}

/**
 * MCP 资源记录
 */
export interface McpResourceRecord {
  uri: string;
  serverName: string;
  name: string;
  mimeType?: string;
}

// ============================================================
// 状态变更事件
// ============================================================

/**
 * 状态变更事件类型
 *
 * ZT 的 setter 会触发 UI 层的重渲染。
 * 以下是会触发 rerender 的关键状态路径。
 */
export type StateChangeKey =
  | 'messages'
  | 'isStreaming'
  | 'showSpinner'
  | 'spinnerText'
  | 'totalCostUsd'
  | 'totalInputTokens'
  | 'totalOutputTokens'
  | 'permissionMode'
  | 'executingTools'
  | 'pendingToolUses'
  | 'mcpServers'
  | 'stopRequested';

/**
 * 状态快照 — 用于会话序列化
 */
export interface StateSnapshot {
  sessionId: string;
  messages: InternalMessage[];
  turnCount: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  mainLoopModel: string;
  permissionMode: string;
  cwd: string;
  timestamp: number;
}
