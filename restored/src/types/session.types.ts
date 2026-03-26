/**
 * Session 和消息持久化类型定义 - 真实提取
 *
 * 来源: source_code/bun_extracted_full.js
 * - Line 46238: JSONL 消息持久化
 * - Line 46288, 46567: compactMetadata
 * - Line 47490: SessionStart, SessionEnd Hook 事件
 * - Line 47545, 47554-47564: Session 管理 (session_id, getSessionInfo, getSessionMessages)
 * - Line 47663, 47673-47685: Session 恢复和列出
 * - Line 48554: .jsonl 文件扩展名
 * - Line 48564: resume 字段
 *
 * 可信度: 95% (类型名称), 85% (接口结构)
 */

/**
 * Session ID 格式
 *
 * 来源: Line 47545, 47663
 * 可信度: 100%
 */
export type SessionId = string;

/**
 * Session 信息
 *
 * 来源: Line 47561, 47681
 * 可信度: 90%
 */
export interface SessionInfo {
  sessionId: SessionId;                   // ✅ Session ID
  createdAt?: number;                     // ⚠️ 创建时间
  updatedAt?: number;                     // ⚠️ 更新时间
  messageCount?: number;                  // ⚠️ 消息数量
  metadata?: Record<string, any>;         // ⚠️ 元数据
}

/**
 * Session 消息
 *
 * 来源: Line 47564, 47685
 * 可信度: 90%
 */
export interface SessionMessage {
  type: 'user' | 'assistant' | 'system';  // ⚠️ 消息类型
  message: any;                           // ⚠️ 消息内容
  uuid: string;                           // ⚠️ UUID
  timestamp: number;                      // ⚠️ 时间戳
}

/**
 * Session 查询选项
 *
 * 来源: Line 47564, 47685
 * 可信度: 90%
 */
export interface SessionQueryOptions {
  limit?: number;                         // ⚠️ 限制数量
  offset?: number;                        // ⚠️ 偏移量
}

/**
 * Session 管理 API
 *
 * 来源: Line 47554-47564, 47673-47685
 * 可信度: 95%
 */
export interface SessionManagerAPI {
  // ✅ 列出所有 Sessions
  listSessions(): Promise<SessionInfo[]>;

  // ✅ 获取 Session 信息
  getSessionInfo(sessionId: SessionId): Promise<SessionInfo>;

  // ✅ 获取 Session 消息
  getSessionMessages(sessionId: SessionId, options?: SessionQueryOptions): Promise<SessionMessage[]>;
}

/**
 * JSONL 持久化格式
 *
 * 来源: Line 46238, 48554
 * 格式: 每行一个 JSON 对象
 * 可信度: 100%
 */
export interface JSONLMessage {
  type: string;                           // ✅ 消息类型
  message: any;                           // ✅ 消息内容
  uuid: string;                           // ✅ UUID
  timestamp: number;                      // ✅ 时间戳
  [key: string]: any;                     // ⚠️ 其他字段
}

/**
 * Compact Metadata
 *
 * 来源: Line 46288, 46567
 * 可信度: 85%
 */
export interface CompactMetadata {
  preservedSegment?: PreservedSegment;     // ⚠️ 保留段
  compactedAt?: number;                   // ⚠️ 压缩时间
  originalTokenCount?: number;            // ⚠️ 原始 Token 数
  compactedTokenCount?: number;           // ⚠️ 压缩后 Token 数
}

/**
 * Preserved Segment
 *
 * 来源: Line 46288
 * 可信度: 80%
 */
export interface PreservedSegment {
  start?: number;                         // ⚠️ 起始位置
  end?: number;                           // ⚠️ 结束位置
  content?: any[];                        // ⚠️ 保留内容
  reason?: string;                        // ⚠️ 保留原因
}

/**
 * Session 恢复配置
 *
 * 来源: Line 48554, 48564
 * 可信度: 95%
 */
export interface SessionResumeConfig {
  resume: string;                         // ✅ Session 文件路径 (.jsonl)
  sdkUrl?: string;                        // ⚠️ SDK URL
}

/**
 * Session Hook 事件
 *
 * 来源: Line 47490
 * 可信度: 95%
 */
export type SessionHookEvent =
  | 'SessionStart'                        // ✅ Session 开始
  | 'SessionEnd';                         // ✅ Session 结束

/**
 * Session Start Hook 输入
 *
 * 来源: 从 Hook 系统推导
 * 可信度: 80%
 */
export interface SessionStartHookInput {
  sessionId: SessionId;                   // ⚠️ Session ID
  timestamp: number;                      // ⚠️ 时间戳
  metadata?: Record<string, any>;         // ⚠️ 元数据
}

/**
 * Session End Hook 输入
 *
 * 来源: 从 Hook 系统推导
 * 可信度: 80%
 */
export interface SessionEndHookInput {
  sessionId: SessionId;                   // ⚠️ Session ID
  timestamp: number;                      // ⚠️ 时间戳
  duration?: number;                      // ⚠️ 持续时间 (ms)
  messageCount?: number;                  // ⚠️ 消息数量
  reason?: 'completed' | 'error' | 'user_cancelled';  // ⚠️ 结束原因
}

/**
 * JSONL 文件写入器
 *
 * 来源: Line 46238
 * 可信度: 85%
 */
export interface JSONLWriter {
  // ⚠️ 写入消息
  write(message: JSONLMessage): void;

  // ⚠️ 关闭文件
  close(): void;

  // ⚠️ 刷新缓冲区
  flush(): void;
}

/**
 * JSONL 文件读取器
 *
 * 来源: Line 46238
 * 可信度: 85%
 */
export interface JSONLReader {
  // ⚠️ 读取所有消息
  readAll(): Promise<JSONLMessage[]>;

  // ⚠️ 读取指定范围
  readRange(offset: number, limit: number): Promise<JSONLMessage[]>;

  // ⚠️ 逐行读取
  readLineByLine(onMessage: (message: JSONLMessage) => void): Promise<void>;

  // ⚠️ 关闭文件
  close(): void;
}

/**
 * Session 持久化配置
 *
 * 来源: 从 Session 管理推导
 * 可信度: 80%
 */
export interface SessionPersistenceConfig {
  enabled: boolean;                       // ⚠️ 是否启用持久化
  directory: string;                      // ⚠️ 持久化目录
  maxSessions?: number;                   // ⚠️ 最大 Session 数量
  maxAge?: number;                        // ⚠️ 最大保存时间 (ms)
  compression?: boolean;                  // ⚠️ 是否启用压缩
}

/**
 * Session 压缩触发条件
 *
 * 来源: 从 CompactMetadata 推导
 * 可信度: 75%
 */
export interface SessionCompactTrigger {
  tokenThreshold?: number;                // ⚠️ Token 阈值
  messageCountThreshold?: number;         // ⚠️ 消息数量阈值
  timeThreshold?: number;                 // ⚠️ 时间阈值 (ms)
  manual?: boolean;                       // ⚠️ 手动触发
}

/**
 * Message Param 类型
 *
 * 来源: Line 46879
 * 可信度: 90%
 */
export interface MessageParam {
  role: 'user' | 'assistant' | 'system';  // ✅ 角色
  content: string | ContentBlockParam[];  // ✅ 内容
}

/**
 * Content Block Param 类型
 *
 * 来源: Line 46783-46785, 46829
 * 可信度: 90%
 */
export type ContentBlockParam =
  | TextBlockParam
  | ToolResultBlockParam;

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
 * Text Block Param
 *
 * 来源: 从 MessageParam 推导
 * 可信度: 90%
 */
export interface TextBlockParam {
  type: 'text';                           // ⚠️
  text: string;                           // ⚠️
}

/**
 * Tool Result Block Param
 *
 * 来源: Line 48214-48219
 * 可信度: 95%
 */
export interface ToolResultBlockParam {
  type: 'tool_result';                    // ✅
  tool_use_id: string;                    // ✅
  content: string | TextBlockParam[];     // ✅
  is_error?: boolean;                     // ⚠️
}
