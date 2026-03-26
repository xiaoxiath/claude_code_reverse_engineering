/**
 * SSE (Server-Sent Events) 类型定义 - 真实提取
 *
 * 来源: source_code/bun_extracted_full.js
 * - Line 46962-46973: SSE 事件示例
 * - Line 48144-48154: SSE 事件格式
 * - Line 58835-58845: SSE 事件示例
 * - Line 20136-20139: EventSource 类定义
 *
 * 可信度: 100% (事件类型), 95% (事件结构)
 */

/**
 * SSE 事件类型
 *
 * 来源: Line 46962-46972
 * 可信度: 100%
 */
export type SSEEventType =
  | 'message_start'           // ✅ 消息开始
  | 'content_block_start'     // ✅ 内容块开始
  | 'content_block_delta'     // ✅ 内容块增量
  | 'content_block_stop'      // ✅ 内容块停止
  | 'message_delta'           // ✅ 消息增量
  | 'message_stop';           // ✅ 消息停止

/**
 * SSE 事件基础接口
 *
 * 来源: Line 46963-46973
 * 可信度: 100%
 */
export interface SSEEventBase {
  type: SSEEventType;         // ✅ 事件类型
}

/**
 * 消息开始事件
 *
 * 来源: Line 46962-46963
 * 示例: event: message_start
 * 可信度: 95%
 */
export interface MessageStartEvent extends SSEEventBase {
  type: 'message_start';      // ✅
  message: {
    id: string;               // ✅ 消息 ID (msg_...)
    type: 'message';          // ✅ 消息类型
    role: 'assistant';        // ⚠️ 角色
    content: ContentBlock[];  // ⚠️ 内容块数组
    model: string;            // ⚠️ 模型名称
    stop_reason: StopReason | null;  // ⚠️ 停止原因
    usage?: Usage;            // ⚠️ Token 使用统计
  };
}

/**
 * 内容块开始事件
 *
 * 来源: Line 46964-46965
 * 示例: event: content_block_start
 * 可信度: 95%
 */
export interface ContentBlockStartEvent extends SSEEventBase {
  type: 'content_block_start';  // ✅
  index: number;                // ✅ 内容块索引
  content_block: ContentBlock;  // ⚠️ 内容块
}

/**
 * 内容块增量事件
 *
 * 来源: Line 46966-46967
 * 示例: event: content_block_delta
 * 可信度: 95%
 */
export interface ContentBlockDeltaEvent extends SSEEventBase {
  type: 'content_block_delta';  // ✅
  index: number;                // ✅ 内容块索引
  delta: TextDelta | InputJsonDelta;  // ⚠️ 增量内容
}

/**
 * 内容块停止事件
 *
 * 来源: Line 46968-46969
 * 示例: event: content_block_stop
 * 可信度: 100%
 */
export interface ContentBlockStopEvent extends SSEEventBase {
  type: 'content_block_stop';  // ✅
  index: number;               // ✅ 内容块索引
}

/**
 * 消息增量事件
 *
 * 来源: Line 46970-46971
 * 示例: event: message_delta
 * 可信度: 95%
 */
export interface MessageDeltaEvent extends SSEEventBase {
  type: 'message_delta';       // ✅
  delta: {
    stop_reason: StopReason;   // ⚠️ 停止原因
  };
  usage: {
    output_tokens: number;     // ✅ 输出 Token 数
  };
}

/**
 * 消息停止事件
 *
 * 来源: Line 46972-46973
 * 示例: event: message_stop
 * 可信度: 100%
 */
export interface MessageStopEvent extends SSEEventBase {
  type: 'message_stop';  // ✅
}

/**
 * SSE 事件联合类型
 *
 * 来源: Line 46962-46973
 * 可信度: 100%
 */
export type SSEEvent =
  | MessageStartEvent
  | ContentBlockStartEvent
  | ContentBlockDeltaEvent
  | ContentBlockStopEvent
  | MessageDeltaEvent
  | MessageStopEvent;

/**
 * 内容块类型
 *
 * 来源: Line 46702, 46716, 46777, 46783
 * 可信度: 90%
 */
export type ContentBlock =
  | TextBlock
  | ToolUseBlock
  | ToolResultBlock;

/**
 * 文本块
 *
 * 来源: Line 46965
 * 可信度: 95%
 */
export interface TextBlock {
  type: 'text';      // ✅
  text: string;      // ✅
}

/**
 * 工具使用块
 *
 * 来源: 从 Tool Use 文档推导
 * 可信度: 85%
 */
export interface ToolUseBlock {
  type: 'tool_use';        // ⚠️
  id: string;              // ⚠️ 工具使用 ID
  name: string;            // ⚠️ 工具名称
  input: any;              // ⚠️ 工具输入
}

/**
 * 工具结果块
 *
 * 来源: 从 Tool Use 文档推导
 * 可信度: 85%
 */
export interface ToolResultBlock {
  type: 'tool_result';     // ⚠️
  tool_use_id: string;     // ⚠️ 工具使用 ID
  content: string;         // ⚠️ 工具结果
  is_error?: boolean;      // ⚠️ 是否错误
}

/**
 * 文本增量
 *
 * 来源: Line 46967
 * 可信度: 95%
 */
export interface TextDelta {
  type: 'text_delta';  // ✅
  text: string;        // ✅
}

/**
 * 输入 JSON 增量
 *
 * 来源: 从 tool_use 推导
 * 可信度: 85%
 */
export interface InputJsonDelta {
  type: 'input_json_delta';  // ⚠️
  partial_json: string;      // ⚠️
}

/**
 * 停止原因
 *
 * 来源: Line 46971
 * 可信度: 90%
 */
export type StopReason =
  | 'end_turn'         // ✅ 正常结束
  | 'max_tokens'       // ⚠️ 达到最大 Token
  | 'stop_sequence'    // ⚠️ 遇到停止序列
  | 'tool_use';        // ⚠️ 工具使用

/**
 * Token 使用统计
 *
 * 来源: Line 46208, 46249, 46329, 46331
 * 可信度: 95%
 */
export interface Usage {
  input_tokens: number;              // ✅ 输入 Token 数
  output_tokens: number;             // ✅ 输出 Token 数
  cache_creation_input_tokens?: number;   // ✅ 缓存创建输入 Token
  cache_read_input_tokens?: number;       // ✅ 缓存读取输入 Token
}

/**
 * EventSource 状态
 *
 * 来源: Line 20137-20139
 * 可信度: 100%
 */
export enum EventSourceReadyState {
  CONNECTING = 0,  // ✅ 连接中
  OPEN = 1,        // ✅ 已打开
  CLOSED = 2,      // ✅ 已关闭
}

/**
 * EventSource 类 (SSE 客户端)
 *
 * 来源: Line 20136
 * 可信度: 100%
 */
export interface EventSource extends EventTarget {
  readyState: EventSourceReadyState;  // ✅ 连接状态
  url: string;                        // ✅ SSE 端点 URL
  withCredentials: boolean;           // ✅ 是否包含凭证

  onopen: ((event: Event) => void) | null;       // ✅ 打开事件
  onmessage: ((event: MessageEvent) => void) | null;  // ✅ 消息事件
  onerror: ((event: Event) => void) | null;      // ✅ 错误事件

  close(): void;  // ✅ 关闭连接
}
