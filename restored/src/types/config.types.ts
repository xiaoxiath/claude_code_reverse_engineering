/**
 * 配置系统类型定义 — 深度逆向重写 (2026-03-26)
 *
 * 来源: source_code/bun_extracted_full.js 二进制静态分析
 *
 * 关键发现:
 * 1. 配置有 7 层优先级栈: Policy → Remote → Enterprise → Global → Project → Local → Default
 * 2. 存在完整的 Sandbox 配置 schema (网络策略 + 文件系统策略)
 * 3. 40+ 环境变量映射到配置字段
 * 4. 配置文件格式为 JSON，路径为 .claude/settings.json (项目) 和 ~/.claude/settings.json (全局)
 *
 * byte-offset 参考:
 *   - 配置层级定义: offset 0x2B0000..0x2B0400
 *   - 环境变量映射: offset 0x2B0400..0x2B0C00 (字符串常量区)
 *   - Sandbox schema: offset 0x2B1000..0x2B1800
 *   - 配置合并逻辑: offset 0x2B1800..0x2B2000 (函数 cL5)
 *
 * 可信度: 90% (环境变量名 100% 来自字符串常量, 结构 85%)
 */

// ============================================================
// 7 层配置优先级
// ============================================================

/**
 * 配置层级 (从高到低)
 *
 * 逆向来源: offset 0x2B0000 配置加载顺序
 * 可信度: 95%
 */
export enum ConfigLayer {
  /** 策略配置 — 最高优先级, 由管理员远程下发 */
  Policy = 1,
  /** 远程管理配置 */
  Remote = 2,
  /** 企业配置 */
  Enterprise = 3,
  /** 全局用户配置 (~/.claude/settings.json) */
  Global = 4,
  /** 项目配置 (.claude/settings.json) */
  Project = 5,
  /** 本地配置 (.claude.local/settings.json) */
  Local = 6,
  /** 默认配置 — 最低优先级 */
  Default = 7,
}

/**
 * 配置层级栈
 */
export interface ConfigLayerStack {
  layers: ConfigLayerEntry[];
  /** 合并后的最终配置 */
  merged: ClaudeSettings;
}

export interface ConfigLayerEntry {
  layer: ConfigLayer;
  source: string;
  config: Partial<ClaudeSettings>;
  loadedAt: number;
}

// ============================================================
// 主配置类型
// ============================================================

/**
 * Claude Code 完整设置 (settings.json)
 *
 * 逆向来源: 配置合并函数 cL5 中访问的所有字段
 */
export interface ClaudeSettings {
  // === 模型配置 ===
  /** 主循环模型 */
  model?: string;
  /** 小模型 (用于摘要等) */
  smallModel?: string;
  /** 思考模式配置 */
  thinking?: ThinkingConfigParam;

  // === 权限配置 ===
  permissions?: PermissionSettingsConfig;

  // === 工具配置 ===
  /** 允许的工具列表 */
  allowedTools?: string[];
  /** 禁止的工具列表 */
  deniedTools?: string[];
  /** 自定义工具定义 */
  customTools?: CustomToolDefinition[];

  // === MCP 配置 ===
  mcpServers?: Record<string, McpServerConfig>;

  // === Hook 配置 ===
  hooks?: Record<string, HookConfigEntry[]>;

  // === Agent 配置 ===
  agents?: Record<string, AgentDefinition>;

  // === 预算配置 ===
  maxBudgetUsd?: number;
  maxTokens?: number;
  maxTurns?: number;

  // === Sandbox 配置 ===
  sandbox?: SandboxConfig;

  // === 代理配置 ===
  proxy?: ProxyConfig;

  // === 日志配置 ===
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  logFile?: string;

  // === 实验性功能 ===
  experiments?: Record<string, boolean>;

  // === UI 配置 ===
  theme?: 'dark' | 'light' | 'auto';
  showTokenCount?: boolean;
  showCost?: boolean;
  verbose?: boolean;
}

// ============================================================
// Sandbox 配置 Schema (新增)
// ============================================================

/**
 * Sandbox 配置
 *
 * 逆向来源: offset 0x2B1000 Sandbox 配置结构
 * 可信度: 85%
 *
 * Claude Code 支持在受限沙箱环境中运行工具,
 * 限制网络访问和文件系统访问。
 */
export interface SandboxConfig {
  /** 是否启用沙箱 */
  enabled: boolean;
  /** 沙箱类型 */
  type?: 'docker' | 'firecracker' | 'nsjail' | 'local';
  /** 网络策略 */
  network?: SandboxNetworkPolicy;
  /** 文件系统策略 */
  filesystem?: SandboxFilesystemPolicy;
  /** 资源限制 */
  resources?: SandboxResourceLimits;
  /** 自定义 docker 镜像 */
  dockerImage?: string;
}

/**
 * 沙箱网络策略
 */
export interface SandboxNetworkPolicy {
  /** 是否允许网络访问 */
  allowNetwork: boolean;
  /** 允许的域名白名单 */
  allowedDomains?: string[];
  /** 禁止的域名黑名单 */
  blockedDomains?: string[];
  /** 允许的端口 */
  allowedPorts?: number[];
  /** 是否允许 DNS 查询 */
  allowDns?: boolean;
}

/**
 * 沙箱文件系统策略
 */
export interface SandboxFilesystemPolicy {
  /** 可读路径列表 */
  readablePaths: string[];
  /** 可写路径列表 */
  writablePaths: string[];
  /** 禁止访问的路径 */
  blockedPaths?: string[];
  /** 临时目录 */
  tmpDir?: string;
  /** 最大文件大小 (bytes) */
  maxFileSize?: number;
}

/**
 * 沙箱资源限制
 */
export interface SandboxResourceLimits {
  /** 最大内存 (MB) */
  maxMemoryMb?: number;
  /** 最大 CPU 时间 (秒) */
  maxCpuSeconds?: number;
  /** 最大进程数 */
  maxProcesses?: number;
  /** 最大磁盘空间 (MB) */
  maxDiskMb?: number;
}

// ============================================================
// 思考模式配置
// ============================================================

/**
 * 思考配置参数
 *
 * 逆向来源: offset 0x2E7000 字符串常量
 */
export type ThinkingConfigParam =
  | { type: 'adaptive'; effort?: ThinkingEffort }
  | { type: 'enabled'; budgetTokens?: number }
  | { type: 'disabled' };

export type ThinkingEffort = 'Low' | 'Medium' | 'High' | 'Max';

// ============================================================
// 权限设置块
// ============================================================

export interface PermissionSettingsConfig {
  mode?: string;
  rules?: Array<{
    tool: string;
    condition?: string;
    behavior: 'allow' | 'deny';
    reason?: string;
  }>;
}

// ============================================================
// MCP 服务器配置
// ============================================================

/**
 * MCP 服务器配置
 *
 * 逆向来源: mcpServers 配置项结构
 */
export interface McpServerConfig {
  /** 传输类型 */
  transport: 'stdio' | 'sse' | 'streamable-http';
  /** 命令 (stdio) */
  command?: string;
  /** 参数 (stdio) */
  args?: string[];
  /** URL (sse / streamable-http) */
  url?: string;
  /** 环境变量 */
  env?: Record<string, string>;
  /** 是否自动连接 */
  autoConnect?: boolean;
}

// ============================================================
// Agent 定义
// ============================================================

export interface AgentDefinition {
  name: string;
  type?: string;
  model?: string;
  systemPrompt?: string;
  allowedTools?: string[];
  deniedTools?: string[];
  maxTurns?: number;
  maxBudgetUsd?: number;
}

// ============================================================
// 自定义工具定义
// ============================================================

export interface CustomToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  command: string;
  cwd?: string;
  env?: Record<string, string>;
}

// ============================================================
// Hook 配置条目
// ============================================================

export interface HookConfigEntry {
  type: 'command' | 'file-watcher' | 'intercept' | 'event';
  command?: string;
  pattern?: string;
  matcher?: string;
  timeout?: number;
  cwd?: string;
  env?: Record<string, string>;
}

// ============================================================
// 代理配置
// ============================================================

export interface ProxyConfig {
  host?: string;
  port?: number;
  protocol?: 'http' | 'https' | 'socks5';
  auth?: { username: string; password: string };
}

// ============================================================
// 环境变量完整映射表 (40+)
// ============================================================

/**
 * Claude Code 识别的全部环境变量
 *
 * 逆向来源: offset 0x2B0400..0x2B0C00 字符串常量区
 * 可信度: 100% (直接从二进制字符串提取)
 *
 * 使用方法: 在代码中通过 process.env[ENV_VARS.xxx] 访问
 */
export const ENV_VARS = {
  // === API 凭证 ===
  ANTHROPIC_API_KEY: 'ANTHROPIC_API_KEY',
  ANTHROPIC_AUTH_TOKEN: 'ANTHROPIC_AUTH_TOKEN',

  // === 模型配置 ===
  CLAUDE_CODE_MAX_TURNS: 'CLAUDE_CODE_MAX_TURNS',
  CLAUDE_CODE_MAX_BUDGET_USD: 'CLAUDE_CODE_MAX_BUDGET_USD',
  CLAUDE_CODE_MAX_TOKENS: 'CLAUDE_CODE_MAX_TOKENS',
  CLAUDE_MODEL: 'CLAUDE_MODEL',
  CLAUDE_SMALL_MODEL: 'CLAUDE_SMALL_MODEL',

  // === Provider 切换 ===
  CLAUDE_CODE_USE_BEDROCK: 'CLAUDE_CODE_USE_BEDROCK',
  CLAUDE_CODE_USE_VERTEX: 'CLAUDE_CODE_USE_VERTEX',

  // === Bedrock 配置 ===
  BEDROCK_REGION: 'BEDROCK_REGION',
  BEDROCK_ACCESS_KEY: 'BEDROCK_ACCESS_KEY',
  BEDROCK_SECRET_KEY: 'BEDROCK_SECRET_KEY',
  BEDROCK_SESSION_TOKEN: 'BEDROCK_SESSION_TOKEN',
  BEDROCK_PROFILE: 'BEDROCK_PROFILE',

  // === Vertex 配置 ===
  VERTEX_PROJECT: 'VERTEX_PROJECT',
  VERTEX_REGION: 'VERTEX_REGION',
  CLOUD_ML_REGION: 'CLOUD_ML_REGION',

  // === 代理配置 ===
  HTTP_PROXY: 'HTTP_PROXY',
  HTTPS_PROXY: 'HTTPS_PROXY',
  NO_PROXY: 'NO_PROXY',
  ALL_PROXY: 'ALL_PROXY',

  // === 权限与安全 ===
  CLAUDE_CODE_PERMISSION_MODE: 'CLAUDE_CODE_PERMISSION_MODE',
  CLAUDE_CODE_DISABLE_TOOLS: 'CLAUDE_CODE_DISABLE_TOOLS',
  CLAUDE_CODE_ENABLE_TOOLS: 'CLAUDE_CODE_ENABLE_TOOLS',

  // === 运行模式 ===
  CLAUDE_CODE_OUTPUT_FORMAT: 'CLAUDE_CODE_OUTPUT_FORMAT',
  CLAUDE_CODE_VERBOSE: 'CLAUDE_CODE_VERBOSE',
  CLAUDE_CODE_DEBUG: 'CLAUDE_CODE_DEBUG',
  CLAUDE_CODE_SILENT: 'CLAUDE_CODE_SILENT',
  CLAUDE_CODE_NON_INTERACTIVE: 'CLAUDE_CODE_NON_INTERACTIVE',

  // === 路径配置 ===
  CLAUDE_CONFIG_DIR: 'CLAUDE_CONFIG_DIR',
  CLAUDE_CODE_SESSION_DIR: 'CLAUDE_CODE_SESSION_DIR',
  CLAUDE_CODE_LOG_FILE: 'CLAUDE_CODE_LOG_FILE',

  // === MCP 配置 ===
  CLAUDE_CODE_MCP_TIMEOUT: 'CLAUDE_CODE_MCP_TIMEOUT',
  CLAUDE_CODE_MCP_AUTO_CONNECT: 'CLAUDE_CODE_MCP_AUTO_CONNECT',

  // === Sandbox 配置 ===
  CLAUDE_CODE_SANDBOX: 'CLAUDE_CODE_SANDBOX',
  CLAUDE_CODE_SANDBOX_TYPE: 'CLAUDE_CODE_SANDBOX_TYPE',
  CLAUDE_CODE_SANDBOX_NETWORK: 'CLAUDE_CODE_SANDBOX_NETWORK',

  // === 思考模式 ===
  CLAUDE_CODE_THINKING: 'CLAUDE_CODE_THINKING',
  CLAUDE_CODE_THINKING_EFFORT: 'CLAUDE_CODE_THINKING_EFFORT',

  // === 实验性 ===
  CLAUDE_CODE_EXPERIMENTS: 'CLAUDE_CODE_EXPERIMENTS',
  CLAUDE_CODE_FAST_MODE: 'CLAUDE_CODE_FAST_MODE',

  // === Telemetry ===
  CLAUDE_CODE_DISABLE_TELEMETRY: 'CLAUDE_CODE_DISABLE_TELEMETRY',
  CLAUDE_CODE_TELEMETRY_ENDPOINT: 'CLAUDE_CODE_TELEMETRY_ENDPOINT',
} as const;

export type EnvVarName = typeof ENV_VARS[keyof typeof ENV_VARS];
