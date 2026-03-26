/**
 * MCP (Model Context Protocol) 类型定义 - 真实提取
 *
 * 来源: source_code/bun_extracted_full.js
 * - Line 46315: MCP 工具命名格式
 * - Line 47064, 47069: BetaRequestMCPServerURLDefinition
 * - Line 47458, 47504: mcpServers 配置
 * - Line 47571: McpServerStatus
 * - Line 47640: MCP Server Integration
 * - Line 48565, 48568: MCP 工具验证
 * - Line 48578-48586: MCP 服务器管理
 * - Line 48909: MAX_MCP_OUTPUT_TOKENS
 * - Line 48915: MCP 输出截断警告
 * - Line 49151: mcp__ 前缀
 * - Line 51913-51917: MCP tab group 相关
 *
 * 可信度: 95% (类型名称), 85% (接口结构)
 */

/**
 * MCP 工具命名格式
 *
 * 来源: Line 46315, 49151
 * 格式: mcp__${serverName}__${toolName}
 * 可信度: 100%
 */
export type MCPToolName = `mcp__${string}__${string}`;

/**
 * MCP 服务器定义
 *
 * 来源: Line 47458, 47504
 * 可信度: 95%
 */
export interface MCPServerDefinition {
  name: string;                           // ✅ 服务器名称
  url?: string;                           // ⚠️ 服务器 URL
  command?: string;                       // ⚠️ 启动命令
  args?: string[];                        // ⚠️ 命令参数
  env?: Record<string, string>;           // ⚠️ 环境变量
}

/**
 * MCP 服务器状态
 *
 * 来源: Line 47571
 * 可信度: 90%
 */
export interface MCPServerStatus {
  name: string;                           // ⚠️ 服务器名称
  connected: boolean;                     // ⚠️ 是否已连接
  healthy?: boolean;                      // ⚠️ 是否健康
  tools?: MCPToolInfo[];                  // ⚠️ 可用工具
  error?: string;                         // ⚠️ 错误信息
  lastChecked?: number;                   // ⚠️ 最后检查时间
}

/**
 * MCP 工具信息
 *
 * 来源: 从 MCP 工具命名推导
 * 可信度: 85%
 */
export interface MCPToolInfo {
  name: string;                           // ⚠️ 工具名称 (不含 mcp__ 前缀)
  fullName: MCPToolName;                  // ⚠️ 完整名称 (mcp__server__tool)
  serverName: string;                     // ⚠️ 所属服务器
  description?: string;                   // ⚠️ 工具描述
  inputSchema?: any;                      // ⚠️ 输入 Schema
}

/**
 * MCP 服务器配置
 *
 * 来源: Line 47504
 * 可信度: 95%
 */
export interface MCPServersConfig {
  mcpServers?: Record<string, MCPServerDefinition>;  // ✅ MCP 服务器配置
}

/**
 * MCP 请求 URL 定义
 *
 * 来源: Line 47064, 47069
 * 可信度: 90%
 */
export interface MCPServerURLDefinition {
  name: string;                           // ⚠️ 服务器名称
  url: string;                            // ⚠️ 服务器 URL
}

/**
 * MCP 输出配置
 *
 * 来源: Line 48909, 48915
 * 可信度: 95%
 */
export interface MCPOutputConfig {
  maxOutputTokens: number;                // ✅ 最大输出 Token (MAX_MCP_OUTPUT_TOKENS)
  truncateWarning?: string;               // ✅ 截断警告消息
}

/**
 * MCP 服务器作用域
 *
 * 来源: Line 48581-48586
 * 可信度: 100%
 */
export type MCPServerScope =
  | 'local'                               // ✅ 本地配置
  | 'project'                             // ✅ 项目配置
  | 'user';                               // ✅ 用户配置

/**
 * MCP 服务器管理操作
 *
 * 来源: Line 48578-48594
 * 可信度: 90%
 */
export interface MCPManagerOperations {
  // ✅ 添加 MCP 服务器
  addServer(name: string, config: MCPServerDefinition, scope: MCPServerScope): Promise<void>;

  // ✅ 删除 MCP 服务器
  removeServer(name: string, scope: MCPServerScope): Promise<void>;

  // ✅ 列出 MCP 服务器
  listServers(): Promise<{ servers: Record<string, MCPServerStatus> }>;

  // ✅ 检查服务器健康状态
  checkServerHealth(): Promise<void>;
}

/**
 * MCP Tab Group 上下文
 *
 * 来源: Line 51913-51917
 * 可信度: 90%
 */
export interface MCPTabGroupContext {
  // ✅ 获取 MCP tab group 上下文
  tabs_context_mcp(): Promise<{
    tabIds: string[];                     // ⚠️ Tab ID 列表
    groupId: string;                      // ⚠️ Group ID
  }>;

  // ✅ 创建 MCP tab group
  createMcpTabGroup(): Promise<void>;

  // ✅ 创建新 tab
  tabs_create_mcp(): Promise<{
    tabId: string;                        // ⚠️ Tab ID
  }>;
}

/**
 * MCP 工具使用块
 *
 * 来源: 从 MCP 工具命名推导
 * 可信度: 85%
 */
export interface MCPToolUseBlock {
  type: 'mcp_tool_use';                   // ⚠️
  id: string;                             // ⚠️ 工具使用 ID
  name: MCPToolName;                      // ⚠️ 完整工具名称
  serverName: string;                     // ⚠️ 服务器名称
  toolName: string;                       // ⚠️ 工具名称
  input: any;                             // ⚠️ 工具输入
}

/**
 * MCP 工具结果块
 *
 * 来源: 从 MCP 工具命名推导
 * 可信度: 85%
 */
export interface MCPToolResultBlock {
  type: 'mcp_tool_result';                // ⚠️
  tool_use_id: string;                    // ⚠️ 工具使用 ID
  content: string;                        // ⚠️ 工具结果
  is_error?: boolean;                     // ⚠️ 是否错误
  truncated?: boolean;                    // ⚠️ 是否被截断
}

/**
 * MCP 服务器导入结果
 *
 * 来源: Line 48578
 * 可信度: 95%
 */
export interface MCPServerImportResult {
  count: number;                          // ✅ 导入的服务器数量
  scope: MCPServerScope;                  // ✅ 导入的作用域
  servers: string[];                      // ⚠️ 导入的服务器名称列表
}

/**
 * MCP 服务器删除确认
 *
 * 来源: Line 48583-48586
 * 可信度: 95%
 */
export interface MCPServerDeleteConfirmation {
  name: string;                           // ✅ 服务器名称
  scope: MCPServerScope;                  // ✅ 删除的作用域
  existsIn: MCPServerScope[];             // ✅ 存在的作用域列表
}

/**
 * MCP 工具验证错误
 *
 * 来源: Line 48565, 48568
 * 可信度: 95%
 */
export class MCPToolValidationError extends Error {
  constructor(
    public toolName: string,              // ✅ 工具名称
    public reason: string,                // ✅ 错误原因
    public serverName?: string            // ⚠️ 服务器名称
  ) {
    super(`MCP tool validation failed: ${toolName} - ${reason}`);
    this.name = 'MCPToolValidationError';
  }
}

/**
 * MCP 输出截断错误
 *
 * 来源: Line 48915
 * 可信度: 95%
 */
export class MCPOutputTruncatedError extends Error {
  constructor(
    public maxTokens: number,             // ✅ 最大 Token
    public actualTokens: number           // ✅ 实际 Token
  ) {
    super(
      `The tool output was truncated. If this MCP server provides pagination ` +
      `or filtering tools, use them to retrieve specific portions of the data. ` +
      `If pagination is not available, inform the user that you are working with ` +
      `truncated output and results may be incomplete.`
    );
    this.name = 'MCPOutputTruncatedError';
  }
}
