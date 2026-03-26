/**
 * 缓存系统类型定义 - 真实提取
 *
 * 来源: source_code/bun_extracted_full.js 全局搜索
 * 可信度: 100%
 */

/**
 * 缓存统计信息
 *
 * 来源: Agent 类字段 (Line 48540)
 * 可信度: 100%
 */
export interface CacheStatistics {
  // ✅ Token 缓存统计
  cacheCreationInputTokens: number;     // 创建缓存的输入 token
  cacheReadInputTokens: number;         // 从缓存读取的 token
  cacheHitsCompleted: number;           // 缓存命中次数（已完成）
  cacheHitsInflight: number;            // 缓存命中次数（进行中）
}

/**
 * 缓存键属性
 *
 * 来源: 推导自使用上下文
 * 可信度: 85%
 */
export interface CacheKeyAttributes {
  model: string;                        // ⚠️ 模型名称
  messages: any[];                      // ⚠️ 消息数组
  systemPrompt: string;                 // ⚠️ 系统提示
  tools: any[];                         // ⚠️ 工具列表
  temperature?: number;                 // ⚠️ 温度参数
}

/**
 * 缓存条目
 *
 * 来源: CacheEntry 类名推导
 * 可信度: 80%
 */
export interface CacheEntry<T = any> {
  key: string;                          // ⚠️ 缓存键
  value: T;                             // ⚠️ 缓存值
  timestamp: number;                    // ⚠️ 创建时间戳
  ttl?: number;                         // ⚠️ 生存时间 (ms)
  size?: number;                        // ⚠️ 缓存大小
}

/**
 * 缓存处理器
 *
 * 来源: CacheHandler 类名推导
 * 可信度: 75%
 */
export interface CacheHandler<T = any> {
  get(key: string): Promise<CacheEntry<T> | null>;
  set(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  has(key: string): Promise<boolean>;
}

/**
 * 缓存相关类型名称（从源码提取）
 *
 * 来源: 全局搜索 "Cache[A-Z][a-zA-Z]*"
 * 可信度: 100%
 */
export type CacheTypeNames =
  | 'CacheAction'
  | 'CacheCompiler'
  | 'CacheControl'
  | 'CacheControlEphemeral'
  | 'CacheCreationInputTokens'
  | 'CacheDecodeTimes'
  | 'CacheEntry'
  | 'CacheError'
  | 'CacheGetBy'
  | 'CacheHandler'
  | 'CacheInstanceOf'
  | 'CacheKeyAttributes'
  | 'CacheMap'
  | 'CacheMarketplace'
  | 'CachePath'
  | 'CachePutBy'
  | 'CacheReadInputTokens'
  | 'CacheSize'
  | 'CacheWarning';

/**
 * Token 使用统计（包含缓存）
 *
 * 来源: Agent 类 totalUsage 字段
 * 可信度: 100%
 */
export interface TokenUsageWithCache {
  inputTokens: number;                  // ✅ 输入 token
  outputTokens: number;                 // ✅ 输出 token
  cacheReadInputTokens: number;         // ✅ 从缓存读取的 token
  cacheCreationInputTokens: number;     // ✅ 创建缓存的 token
}
