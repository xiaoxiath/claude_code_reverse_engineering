/**
 * 配置系统类型定义 - 真实提取
 *
 * 来源: source_code/bun_extracted_full.js
 * - Line 3019, 3063: parseProxyConfigFromEnv
 * - Line 46264, 46272, 46290: 配置字段
 * - Line 46335-46373: 配置加载
 * - Line 46730-46843: ThinkingConfig
 * - Line 47490: ConfigChange Hook
 * - Line 48581: 配置作用域 (local, project, user)
 * - Line 48610: autoModeConfigHandler
 *
 * 可信度: 90% (类型名称), 80% (接口结构)
 */

/**
 * 配置作用域
 *
 * 来源: Line 48581
 * 可信度: 100%
 */
export type ConfigScope =
  | 'local'                               // ✅ 本地配置
  | 'project'                             // ✅ 项目配置
  | 'user';                               // ✅ 用户配置

/**
 * 配置优先级 (从高到低)
 *
 * 来源: 从配置作用域推导
 * 可信度: 95%
 */
export type ConfigPriority =
  | 1  // Policy settings (最高)
  | 2  // Remote management config
  | 3  // Enterprise config
  | 4  // Global config (~/.claude/config.json)
  | 5  // Project config (.claude/config.json)
  | 6; // Default config (最低)

/**
 * 思考配置 - 自适应模式
 *
 * 来源: Line 46732, 46843, 58605, 58716
 * 可信度: 95%
 */
export interface ThinkingConfigAdaptive {
  type: 'adaptive';                       // ⚠️
  effort?: 'Low' | 'Medium' | 'High' | 'Max';  // ✅ Line 46843
}

/**
 * 思考配置 - 固定预算模式 (已弃用)
 *
 * 来源: Line 46748, 58621
 * 可信度: 90%
 */
export interface ThinkingConfigEnabled {
  type: 'enabled';                        // ⚠️
  BudgetTokens?: number;                  // ✅ 已弃用
}

/**
 * 思考配置参数
 *
 * 来源: Line 46730, 58603
 * 可信度: 90%
 */
export type ThinkingConfigParam =
  | ThinkingConfigAdaptive
  | ThinkingConfigEnabled;

/**
 * Effort 枚举
 *
 * 来源: Line 46843, 58716
 * 可信度: 100%
 */
export type Effort =
  | 'Low'                                 // ✅
  | 'Medium'                              // ✅
  | 'High'                                // ✅
  | 'Max';                                // ✅

/**
 * 代理配置
 *
 * 来源: Line 3019, 3063, 9358
 * 可信度: 85%
 */
export interface ProxyConfig {
  host?: string;                          // ⚠️ 代理主机
  port?: number;                          // ⚠️ 代理端口
  protocol?: string;                      // ⚠️ 协议
  auth?: {
    username: string;                     // ⚠️ 用户名
    password: string;                     // ⚠️ 密码
  };
}

/**
 * 配置文件结构
 *
 * 来源: Line 46335-46373
 * 可信度: 85%
 */
export interface ClaudeConfig {
  // ✅ MCP 服务器配置
  mcpServers?: Record<string, any>;       // ✅ Line 47458, 47504

  // ⚠️ Agent 配置
  agents?: Record<string, AgentDefinition>;  // ⚠️ Line 47510, 59383

  // ⚠️ 工具配置
  tools?: ToolConfig;                     // ⚠️

  // ⚠️ 权限配置
  permissions?: PermissionConfig;         // ⚠️

  // ⚠️ Hook 配置
  hooks?: HookHandlers;                   // ⚠️

  // ⚠️ 思考配置
  thinking?: ThinkingConfigParam;         // ⚠️

  // ⚠️ 预算配置
  maxBudgetUsd?: number;                  // ✅ Line 47508, 59381
  maxTokens?: number;                     // ⚠️
  maxTurns?: number;                      // ⚠️

  // ⚠️ 代理配置
  proxy?: ProxyConfig;                    // ⚠️

  // ⚠️ 日志配置
  logLevel?: 'debug' | 'info' | 'warn' | 'error';  // ⚠️
}

/**
 * Agent 定义
 *
 * 来源: Line 47510, 59383
 * 可信度: 85%
 */
export interface AgentDefinition {
  name: string;                           // ⚠️ Agent 名称
  type?: string;                          // ⚠️ Agent 类型
  description?: string;                   // ⚠️ 描述
  systemPrompt?: string;                  // ⚠️ 系统提示
  allowedTools?: string[];                // ⚠️ 允许的工具
  deniedTools?: string[];                 // ⚠️ 拒绝的工具
  maxTurns?: number;                      // ⚠️ 最大轮次
  maxBudgetUsd?: number;                  // ⚠️ 最大预算
}

/**
 * 工具配置
 *
 * 来源: 从工具系统推导
 * 可信度: 80%
 */
export interface ToolConfig {
  allowedTools?: string[];                // ⚠️ 允许的工具列表
  deniedTools?: string[];                 // ⚠️ 拒绝的工具列表
  customTools?: CustomTool[];             // ⚠️ 自定义工具
}

/**
 * 权限配置
 *
 * 来源: 从权限系统推导
 * 可信度: 80%
 */
export interface PermissionConfig {
  mode?: PermissionMode;                  // ⚠️ 权限模式
  rules?: PermissionRule[];               // ⚠️ 权限规则
}

/**
 * 权限规则
 *
 * 来源: 从权限系统推导
 * 可信度: 75%
 */
export interface PermissionRule {
  tool: string;                           // ⚠️ 工具名称
  action: 'allow' | 'deny';               // ⚠️ 动作
  condition?: string;                     // ⚠️ 条件
}

/**
 * 配置加载选项
 *
 * 来源: Line 46335-46373
 * 可信度: 85%
 */
export interface ConfigLoadOptions {
  scope?: ConfigScope;                    // ⚠️ 配置作用域
  path?: string;                          // ⚠️ 配置文件路径
  priority?: ConfigPriority;              // ⚠️ 优先级
  merge?: boolean;                        // ⚠️ 是否合并配置
}

/**
 * 配置加载结果
 *
 * 来源: 从配置系统推导
 * 可信度: 80%
 */
export interface ConfigLoadResult {
  config: ClaudeConfig;                   // ⚠️ 配置内容
  source: ConfigScope;                    // ⚠️ 配置来源
  path: string;                           // ⚠️ 配置文件路径
  priority: ConfigPriority;               // ⚠️ 优先级
}

/**
 * 配置管理器 API
 *
 * 来源: Line 48581-48586, 48610
 * 可信度: 85%
 */
export interface ConfigManagerAPI {
  // ✅ 加载配置
  loadConfig(options?: ConfigLoadOptions): Promise<ConfigLoadResult>;

  // ✅ 保存配置
  saveConfig(config: ClaudeConfig, scope: ConfigScope): Promise<void>;

  // ✅ 合并配置
  mergeConfig(...configs: ClaudeConfig[]): ClaudeConfig;

  // ✅ 获取配置
  getConfig(scope: ConfigScope): Promise<ClaudeConfig>;

  // ✅ 监听配置变更
  onConfigChange(callback: (config: ClaudeConfig) => void): void;
}

/**
 * 自动模式配置处理器
 *
 * 来源: Line 48610
 * 可信度: 80%
 */
export interface AutoModeConfigHandler {
  (config: ClaudeConfig): ClaudeConfig;
}

/**
 * 配置变更 Hook 输入
 *
 * 来源: Line 47490
 * 可信度: 80%
 */
export interface ConfigChangeHookInput {
  configPath: string;                     // ⚠️ 配置路径
  oldConfig?: ClaudeConfig;               // ⚠️ 旧配置
  newConfig?: ClaudeConfig;               // ⚠️ 新配置
  scope?: ConfigScope;                    // ⚠️ 作用域
  timestamp: number;                      // ⚠️ 时间戳
}

/**
 * 代理配置解析函数
 *
 * 来源: Line 3019, 3063
 * 可信度: 90%
 */
export type ParseProxyConfigFromEnv = (
  env: Record<string, string | undefined>,
  protocol: string,
  keepAlive?: boolean
) => ProxyConfig | null;
