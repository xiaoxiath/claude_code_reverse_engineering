/**
 * Tool 系统类型定义 - 真实提取
 *
 * 来源: source_code/bun_extracted_full.js
 * - Line 46205, 46256, 46315: Tool 定义和注册
 * - Line 46752, 46774, 46831-46832: Tool 类型系统
 * - Line 46887-46892: 内置服务器工具
 * - Line 46998-47077: Tool Use 流程
 * - Line 47189: tool_use 内容块
 * - Line 47471, 47483, 47604: Tool Hook 系统
 * - Line 47543: stop_reason 包含 tool_use
 * - Line 48128: content_block_start 包含 tool_use
 * - Line 48211-48296: Tool Use 和 Tool Result 处理
 * - Line 48300-48322: Tool 版本和命名
 * - Line 48906-48907, 49149: tool_use 事件
 * - Line 49162: tool_result 事件
 * - Line 51335, 51372: tool_use 和 tool_result
 * - Line 51593-51601: chrome_bridge_tool_call
 * - Line 51712-51732: handleToolResult
 *
 * 可信度: 95% (类型名称), 85% (接口结构)
 */

/**
 * Tool 类型联合
 *
 * 来源: Line 46752, 46774
 * 可信度: 90%
 */
export type ToolUnion =
  | CustomTool
  | BuiltinTool;

/**
 * 自定义工具定义
 *
 * 来源: Line 46752, 46862
 * 可信度: 95%
 */
export interface CustomTool {
  name: string;                           // ✅ 工具名称
  description?: string;                   // ⚠️ 工具描述
  input_schema: ToolInputSchema;          // ✅ 输入 Schema

  // ⚠️ 可选配置
  cache_control?: CacheControl;           // ⚠️ 缓存控制
}

/**
 * 内置服务器工具
 *
 * 来源: Line 46887-46892, 47077
 * 可信度: 95%
 */
export type BuiltinTool =
  | ToolBash20250124                      // ✅ Bash 工具 (2025-01-24)
  | ToolTextEditor20250728                // ✅ 文本编辑器 (2025-07-28)
  | WebSearchTool20260209                 // ✅ Web 搜索 (2026-02-09)
  | CodeExecutionTool20260120;            // ✅ 代码执行 (2026-01-20)

/**
 * Bash 工具 (2025-01-24)
 *
 * 来源: Line 46891, 47077
 * 可信度: 95%
 */
export interface ToolBash20250124 {
  type: 'bash_20250124';                  // ✅
  name: 'bash';                           // ✅
}

/**
 * 文本编辑器工具 (2025-07-28)
 *
 * 来源: Line 46892, 48320-48321
 * 可信度: 95%
 */
export interface ToolTextEditor20250728 {
  type: 'text_editor_20250728';           // ✅
  name: 'str_replace_based_edit_tool';    // ✅
}

/**
 * Web 搜索工具 (2026-02-09)
 *
 * 来源: Line 47077
 * 可信度: 95%
 */
export interface WebSearchTool20260209 {
  type: 'web_search_tool_20260209';       // ✅
  name: 'web_search';                     // ✅
}

/**
 * 代码执行工具 (2026-01-20)
 *
 * 来源: Line 47077
 * 可信度: 95%
 */
export interface CodeExecutionTool20260120 {
  type: 'code_execution_tool_20260120';   // ✅
  name: 'code_execution';                 // ✅
}

/**
 * 工具输入 Schema
 *
 * 来源: Line 46752, 46832
 * 可信度: 95%
 */
export interface ToolInputSchema {
  type: 'object';                         // ✅
  properties?: Record<string, any>;       // ⚠️ 属性定义
  required?: string[];                    // ⚠️ 必需字段
  additionalProperties?: boolean;         // ⚠️ 是否允许额外属性
}

/**
 * 缓存控制
 *
 * 来源: Line 46853
 * 可信度: 90%
 */
export interface CacheControl {
  type: 'ephemeral';                      // ⚠️
  ttl?: '5m' | '1h';                      // ⚠️ 生存时间
}

/**
 * Text Block Param
 *
 * 来源: 从 MessageParam 推导
 * 可信度: 90%
 */
export interface TextBlockParam {
  type: 'text';                           // ⚠️
  text: string;                           // ⚠️
  cache_control?: CacheControl;           // ⚠️ 缓存控制
}

/**
 * Tool Use 块
 *
 * 来源: Line 46998, 47189, 48211, 48272, 48296
 * 可信度: 95%
 */
export interface ToolUseBlock {
  type: 'tool_use';                       // ✅
  id: string;                             // ✅ 工具使用 ID
  name: string;                           // ✅ 工具名称
  input: Record<string, any>;             // ✅ 工具输入 (IReadOnlyDictionary<string, JsonElement>)
}

/**
 * Tool Result 块
 *
 * 来源: Line 48214-48219, 48251-48256, 48284, 49162, 51372
 * 可信度: 95%
 */
export interface ToolResultBlock {
  type: 'tool_result';                    // ✅
  tool_use_id: string;                    // ✅ 工具使用 ID
  content: string | TextBlockParam[];     // ✅ 工具结果内容
  is_error?: boolean;                     // ⚠️ 是否错误
}

/**
 * Tool Choice 类型
 *
 * 来源: Line 48296
 * 可信度: 90%
 */
export type ToolChoice =
  | 'auto'                                // ⚠️ 自动选择
  | 'any'                                 // ⚠️ 任意工具
  | 'none'                                // ⚠️ 不使用工具
  | { type: 'tool'; name: string };       // ⚠️ 指定工具

/**
 * Tool 版本映射
 *
 * 来源: Line 48300-48322
 * 可信度: 100%
 */
export const TOOL_VERSIONS = {
  // ✅ Text Editor 工具版本
  ToolTextEditor20250124: {
    name: 'str_replace_editor',
    type: 'text_editor_20250124',
  },
  ToolTextEditor20250429: {
    name: 'str_replace_based_edit_tool',
    type: 'text_editor_20250429',
  },
  ToolTextEditor20250728: {
    name: 'str_replace_based_edit_tool',
    type: 'text_editor_20250728',
  },

  // ✅ Bash 工具版本
  ToolBash20250124: {
    name: 'bash',
    type: 'bash_20250124',
  },
} as const;

/**
 * Tool Hook 输入
 *
 * 来源: Line 47471, 47483, 47604
 * 可信度: 90%
 */
export interface ToolHookInput {
  agent_id?: string;                      // ⚠️ Agent ID
  agent_type?: 'main' | 'subagent';       // ⚠️ Agent 类型
  tool_name: string;                      // ⚠️ 工具名称
  tool_input: Record<string, any>;        // ⚠️ 工具输入
  tool_use_id?: string;                   // ⚠️ 工具使用 ID
}

/**
 * Chrome Bridge Tool Call 事件
 *
 * 来源: Line 51593-51601, 51606, 51610, 51732
 * 可信度: 90%
 */
export interface ChromeBridgeToolCallEvent {
  type: 'tool_call';                      // ⚠️
  tool_name: string;                      // ⚠️ 工具名称
  tool_use_id?: string;                   // ⚠️ 工具使用 ID
  tool_input?: any;                       // ⚠️ 工具输入
  tool_result?: any;                      // ⚠️ 工具结果
  error?: string;                         // ⚠️ 错误信息
}

/**
 * Tool 结果处理器
 *
 * 来源: Line 51712-51732
 * 可信度: 85%
 */
export interface ToolResultHandler {
  // ✅ 处理 Tool Result
  handleToolResult(result: ToolResultBlock): void;

  // ✅ 处理 Permission Request
  handlePermissionRequest(request: {
    tool_use_id?: string;
    request_id?: string;
  }): void;
}

/**
 * Tool 执行状态
 *
 * 来源: 从工具执行流程推导
 * 可信度: 80%
 */
export type ToolExecutionState =
  | 'pending'                             // ⚠️ 等待执行
  | 'executing'                           // ⚠️ 执行中
  | 'completed'                           // ⚠️ 已完成
  | 'failed'                              // ⚠️ 失败
  | 'permission_required';                // ⚠️ 需要权限

/**
 * Tool 执行结果
 *
 * 来源: 从工具执行流程推导
 * 可信度: 80%
 */
export interface ToolExecutionResult {
  tool_use_id: string;                    // ⚠️ 工具使用 ID
  tool_name: string;                      // ⚠️ 工具名称
  state: ToolExecutionState;              // ⚠️ 执行状态
  result?: ToolResultBlock;               // ⚠️ 执行结果
  error?: Error;                          // ⚠️ 错误信息
  duration?: number;                      // ⚠️ 执行时长 (ms)
}

/**
 * 服务器工具类型 (Beta)
 *
 * 来源: Line 46831, 46887
 * 可信度: 90%
 */
export type ServerToolType =
  | 'bash'
  | 'web_search'
  | 'text_editor'
  | 'code_execution';

/**
 * Beta Content Block TryPick 方法
 *
 * 来源: Line 46831
 * 可信度: 95%
 */
export type BetaContentBlockTryPickMethods =
  | 'TryPickText'
  | 'TryPickThinking'
  | 'TryPickRedactedThinking'
  | 'TryPickToolUse'
  | 'TryPickServerToolUse'
  | 'TryPickWebSearchToolResult'
  | 'TryPickWebFetchToolResult'
  | 'TryPickCodeExecutionToolResult'
  | 'TryPickBashCodeExecutionToolResult'
  | 'TryPickTextEditorCodeExecutionToolResult'
  | 'TryPickToolSearchToolResult'
  | 'TryPickMcpToolUse'
  | 'TryPickMcpToolResult'
  | 'TryPickContainerUpload'
  | 'TryPickCompaction';
