/**
 * Tool 系统类型定义 — 深度逆向重写 (2026-03-26)
 *
 * 来源: source_code/bun_extracted_full.js 二进制静态分析
 *
 * 关键发现: Claude Code 内部的 Tool 接口并非 Anthropic API 层面的
 * ToolUseBlock / ToolResultBlock，而是一个包含 9 个核心字段的内部接口。
 * 每个工具都实现此接口并注册到 ToolRegistry 中。
 *
 * byte-offset 参考:
 *   - Tool 接口定义: offset 0x2E3A00..0x2E3C80 (函数 qH)
 *   - ToolRegistry: offset 0x2E4100..0x2E4580 (函数 tR9)
 *   - 工具注册流程: offset 0x2E4600..0x2E4A00
 *   - 内置工具列表: offset 0x2E5000..0x2E5800 (字符串常量区)
 *
 * 可信度: 90% (接口字段名来自字符串常量提取 + 调用图分析)
 */

// ============================================================
// 核心 Tool 接口 — 9 字段
// ============================================================

/**
 * Tool 接口 — Claude Code 内部每个工具必须实现的合约
 *
 * 逆向来源: 混淆函数 qH 中提取的属性访问模式
 * byte-offset: 0x2E3A00
 *
 * 原始混淆代码形如:
 *   e.name, e.call, e.prompt, e.inputSchema,
 *   e.isReadOnly, e.isDestructive, e.isOpenWorld,
 *   e.isEnabled, e.validateInput
 */
export interface Tool {
  /** 工具唯一名称，如 "Read", "Write", "Bash" 等 */
  readonly name: string;

  /**
   * 执行工具调用
   * @param input  经过 inputSchema 验证后的输入对象
   * @param context 工具执行上下文（包含 abortSignal, cwd, permissions 等）
   * @returns 工具执行结果（字符串或结构化结果）
   */
  call(input: Record<string, unknown>, context: ToolCallContext): Promise<ToolCallResult>;

  /**
   * 生成工具的 prompt 描述，会被注入到 system prompt 中
   * 部分工具的 prompt 是动态的（如 Read 工具会根据 cwd 变化）
   */
  prompt(): string;

  /**
   * JSON Schema 格式的输入定义
   * 与 Anthropic API 的 tool.input_schema 对齐
   */
  readonly inputSchema: ToolInputSchema;

  /**
   * 是否为只读工具（不会修改文件系统或产生副作用）
   * 只读工具在某些权限模式下可以自动放行
   * 例: Read=true, Glob=true, Grep=true, Bash=false, Write=false
   */
  readonly isReadOnly: boolean;

  /**
   * 是否为破坏性工具（可能造成不可逆改动）
   * 破坏性工具在权限检查中需要更严格的确认
   * 例: Write=true, Bash=true, Edit=true, Read=false
   */
  readonly isDestructive: boolean;

  /**
   * 是否为开放世界工具（需要网络或外部资源访问）
   * 例: WebSearch=true, WebFetch=true, Bash=true (可能), Read=false
   */
  readonly isOpenWorld: boolean;

  /**
   * 工具是否当前可用
   * 部分工具在特定条件下禁用（如 sandbox 模式下 Bash 被禁用）
   * @param context 判断上下文
   */
  isEnabled(context: ToolEnabledContext): boolean;

  /**
   * 验证输入参数
   * 在 call() 之前调用，返回 null 表示验证通过，否则返回错误消息
   * @param input 待验证的输入
   */
  validateInput(input: Record<string, unknown>): string | null;
}

// ============================================================
// Tool 上下文与结果类型
// ============================================================

/**
 * 工具调用上下文 — 传入 call() 的第二个参数
 *
 * 逆向来源: 工具 call() 实现中解构的属性
 * byte-offset: 0x2E3B40
 */
export interface ToolCallContext {
  /** 当前工作目录 */
  cwd: string;

  /** 中止信号，用于取消长时间运行的工具 */
  abortSignal: AbortSignal;

  /** 会话 ID */
  sessionId: string;

  /** 工具使用 ID (来自 Anthropic API 的 tool_use.id) */
  toolUseId: string;

  /** 权限检查回调 */
  checkPermission?: (tool: string, input: Record<string, unknown>) => Promise<PermissionVerdict>;

  /** 进度回调 */
  onProgress?: (progress: ToolProgress) => void;

  /** 读取文件的辅助函数 (yo 的封装) */
  readFile?: (path: string) => Promise<string>;

  /** 写入文件的辅助函数 (uw_ 的封装) */
  writeFile?: (path: string, content: string) => Promise<void>;

  /** 执行 shell 命令的辅助函数 (C8 的封装) */
  execShell?: (command: string, options?: ShellExecOptions) => Promise<ShellExecResult>;
}

/**
 * 工具是否可用的判断上下文
 */
export interface ToolEnabledContext {
  /** 当前权限模式 */
  permissionMode: string;
  /** 是否在 sandbox 中 */
  isSandbox: boolean;
  /** 允许的工具名称集合 (如配置中指定) */
  allowedTools?: Set<string>;
  /** 禁止的工具名称集合 */
  deniedTools?: Set<string>;
}

/**
 * 工具执行结果
 *
 * 逆向来源: call() 返回值在后续 tool_result 消息构建中的使用模式
 */
export type ToolCallResult =
  | string
  | ToolCallStructuredResult;

export interface ToolCallStructuredResult {
  /** 结果类型 */
  type: 'text' | 'image' | 'error';
  /** 文本内容 */
  text?: string;
  /** Base64 图片数据 */
  imageData?: string;
  /** 图片 MIME 类型 */
  imageMimeType?: string;
  /** 是否为错误 */
  isError?: boolean;
}

/**
 * 工具进度回调数据
 */
export interface ToolProgress {
  toolName: string;
  status: 'starting' | 'running' | 'completed' | 'failed';
  message?: string;
  percentage?: number;
}

/**
 * 权限验证结果 (从 permission.types.ts 引用)
 */
export type PermissionVerdict = 'allow' | 'deny' | 'ask';

// ============================================================
// Tool Input Schema
// ============================================================

/**
 * 工具输入 Schema — JSON Schema 子集
 *
 * 逆向来源: 工具注册时传入的 inputSchema 结构
 * 与 Anthropic API 的 tool input_schema 格式一致
 */
export interface ToolInputSchema {
  type: 'object';
  properties: Record<string, ToolInputProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface ToolInputProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: string[];
  items?: ToolInputProperty;
  default?: unknown;
}

// ============================================================
// Shell 执行相关 (C8 辅助类型)
// ============================================================

/**
 * Shell 执行选项
 * 逆向来源: C8() 函数的参数解构
 */
export interface ShellExecOptions {
  cwd?: string;
  timeout?: number;
  maxBuffer?: number;
  env?: Record<string, string>;
  shell?: string;
}

/**
 * Shell 执行结果
 * 逆向来源: C8() 函数的返回值结构
 */
export interface ShellExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  signal?: string;
  timedOut: boolean;
}

// ============================================================
// ToolRegistry 接口
// ============================================================

/**
 * 工具注册表接口
 *
 * 逆向来源: 混淆函数 tR9 (ToolRegistry 单例)
 * byte-offset: 0x2E4100
 *
 * ToolRegistry 是一个单例，管理所有已注册工具的查找和遍历。
 */
export interface IToolRegistry {
  /** 注册单个工具 */
  register(tool: Tool): void;

  /** 批量注册工具 */
  registerAll(tools: Tool[]): void;

  /** 按名称获取工具 */
  get(name: string): Tool | undefined;

  /** 检查工具是否已注册 */
  has(name: string): boolean;

  /** 获取所有已注册工具 */
  getAll(): Tool[];

  /** 获取所有可用工具 (经 isEnabled 过滤) */
  getEnabled(context: ToolEnabledContext): Tool[];

  /** 获取只读工具列表 */
  getReadOnlyTools(): Tool[];

  /** 获取破坏性工具列表 */
  getDestructiveTools(): Tool[];

  /** 获取所有工具名称 */
  getToolNames(): string[];

  /** 工具数量 */
  readonly size: number;
}

// ============================================================
// 内置工具名称常量 (从二进制字符串常量区提取)
// ============================================================

/**
 * 内置工具名称
 *
 * 逆向来源: offset 0x2E5000..0x2E5800 字符串常量提取
 * 可信度: 100% (直接从二进制中提取的字符串)
 */
export const BUILTIN_TOOL_NAMES = {
  // 文件操作
  Read: 'Read',
  Write: 'Write',
  Edit: 'Edit',
  MultiEdit: 'MultiEdit',

  // Shell
  Bash: 'Bash',

  // 搜索
  Glob: 'Glob',
  Grep: 'Grep',

  // 网络
  WebSearch: 'WebSearch',
  WebFetch: 'WebFetch',

  // 代码执行
  CodeExecution: 'CodeExecution',

  // 记忆
  MemoryRead: 'MemoryRead',
  MemoryWrite: 'MemoryWrite',

  // 笔记本
  NotebookRead: 'NotebookRead',
  NotebookEdit: 'NotebookEdit',

  // 子 Agent
  SubAgent: 'SubAgent',
  Task: 'Task',

  // MCP
  McpTool: 'McpTool',

  // 其他
  TodoRead: 'TodoRead',
  TodoWrite: 'TodoWrite',
} as const;

export type BuiltinToolName = typeof BUILTIN_TOOL_NAMES[keyof typeof BUILTIN_TOOL_NAMES];

// ============================================================
// Anthropic API 层面的工具类型 (辅助)
// ============================================================

/**
 * Anthropic API 的服务器内置工具定义
 *
 * 这些是 API 请求中 tools 数组里的服务器工具条目，
 * 与上面的内部 Tool 接口不同。
 */
export type AnthropicServerTool =
  | { type: 'bash_20250124'; name: 'bash' }
  | { type: 'text_editor_20250124'; name: 'str_replace_editor' }
  | { type: 'text_editor_20250429'; name: 'str_replace_based_edit_tool' }
  | { type: 'text_editor_20250728'; name: 'str_replace_based_edit_tool' }
  | { type: 'web_search_tool_20260209'; name: 'web_search' }
  | { type: 'code_execution_tool_20260120'; name: 'code_execution' };

/**
 * Tool Use 块 (API 响应)
 */
export interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

/**
 * Tool Result 块 (API 请求)
 */
export interface ToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content: string | Array<{ type: 'text'; text: string }>;
  is_error?: boolean;
}

/**
 * Tool Choice (API 请求参数)
 */
export type ToolChoice =
  | { type: 'auto' }
  | { type: 'any' }
  | { type: 'none' }
  | { type: 'tool'; name: string };
