/**
 * Token 和预算系统类型定义 - 真实提取
 *
 * 来源: source_code/bun_extracted_full.js
 * - Line 46205, 46564, 46567: cacheCreationInputTokens, cacheReadInputTokens
 * - Line 46748, 58621: BudgetTokens (deprecated)
 * - Line 47508, 59381: maxBudgetUsd
 * - Line 35652-35653: cacheHitsCompleted, cacheHitsInflight
 *
 * 可信度: 95% (字段名称), 85% (接口结构)
 */

/**
 * Token 使用统计
 *
 * 来源: Line 46205, 46564, 46567
 * 可信度: 95%
 */
export interface TokenUsage {
  input_tokens: number;                      // ✅ 输入 Token 数
  output_tokens: number;                     // ✅ 输出 Token 数
  cache_creation_input_tokens?: number;      // ✅ 缓存创建输入 Token
  cache_read_input_tokens?: number;          // ✅ 缓存读取输入 Token
}

/**
 * 缓存统计信息
 *
 * 来源: Line 35652-35653
 * 可信度: 95%
 */
export interface CacheStatistics {
  cacheCreationInputTokens: number;     // ✅ 缓存创建输入 Token
  cacheReadInputTokens: number;         // ✅ 缓存读取输入 Token
  cacheHitsCompleted: number;           // ✅ 已完成缓存命中
  cacheHitsInflight: number;            // ✅ 进行中缓存命中
}

/**
 * 预算配置
 *
 * 来源: Line 47508, 59381
 * 可信度: 95%
 */
export interface BudgetConfig {
  maxBudgetUsd?: number;          // ✅ 最大预算 (USD)
  maxTokens?: number;             // ⚠️ 最大 Token 数
  maxTurns?: number;              // ⚠️ 最大轮次
}

/**
 * 思考配置 (已弃用)
 *
 * 来源: Line 46748, 58621
 * 说明: "Deprecated: new ThinkingConfigEnabled { BudgetTokens = N }"
 * 可信度: 90%
 */
export interface ThinkingConfigEnabled {
  BudgetTokens?: number;  // ✅ 思考 Token 预算 (已弃用)
}

/**
 * Token 预算追踪器
 *
 * 来源: 从 BudgetTokens, maxBudgetUsd 推导
 * 可信度: 85%
 */
export interface TokenBudget {
  used: number;                  // ⚠️ 已使用 Token
  remaining: number;             // ⚠️ 剩余 Token
  limit: number;                 // ⚠️ Token 限制
  percentage: number;            // ⚠️ 使用百分比
}

/**
 * USD 预算追踪器
 *
 * 来源: 从 maxBudgetUsd 推导
 * 可信度: 85%
 */
export interface UsdBudget {
  used: number;                  // ⚠️ 已使用 USD
  remaining: number;             // ⚠️ 剩余 USD
  limit: number;                 // ⚠️ USD 限制
  percentage: number;            // ⚠️ 使用百分比
}

/**
 * Token 桶 (速率限制)
 *
 * 来源: 从 TokenBucket 概念推导
 * 可信度: 75%
 */
export interface TokenBucket {
  tokens: number;                // ⚠️ 当前 Token 数
  maxTokens: number;             // ⚠️ 最大 Token 数
  refillRate: number;            // ⚠️ 补充速率 (tokens/second)
  lastRefill: number;            // ⚠️ 上次补充时间戳
}

/**
 * Token 计数器
 *
 * 来源: 从 TokenCounter 概念推导
 * 可信度: 80%
 */
export interface TokenCounter {
  count(text: string): number;                    // ⚠️ 计算文本 Token 数
  countMessages(messages: any[]): number;         // ⚠️ 计算消息 Token 数
  estimateCost(tokens: number, model: string): number;  // ⚠️ 估算成本
}

/**
 * 预算检查结果
 *
 * 来源: 从预算系统推导
 * 可信度: 80%
 */
export interface BudgetCheckResult {
  withinBudget: boolean;         // ⚠️ 是否在预算内
  tokensUsed: number;            // ⚠️ 已使用 Token
  tokensRemaining: number;       // ⚠️ 剩余 Token
  usdUsed: number;               // ⚠️ 已使用 USD
  usdRemaining: number;          // ⚠️ 剩余 USD
  warning?: string;              // ⚠️ 警告消息
}

/**
 * 预算超限错误
 *
 * 来源: 从 budget exceeded 错误推导
 * 可信度: 85%
 */
export interface BudgetExceededError extends Error {
  code: 'BUDGET_EXCEEDED';       // ⚠️ 错误码
  tokensUsed: number;            // ⚠️ 已使用 Token
  tokensLimit: number;           // ⚠️ Token 限制
  usdUsed?: number;              // ⚠️ 已使用 USD
  usdLimit?: number;             // ⚠️ USD 限制
}

/**
 * 速率限制信息
 *
 * 来源: 从 rate limiting 推导
 * 可信度: 80%
 */
export interface RateLimitInfo {
  limited: boolean;              // ⚠️ 是否受限
  retryAfter?: number;           // ⚠️ 重试等待时间 (秒)
  remaining?: number;            // ⚠️ 剩余请求数
  resetAt?: number;              // ⚠️ 重置时间戳
}

/**
 * 预算策略类型
 *
 * 来源: 从预算系统推导
 * 可信度: 75%
 */
export type BudgetStrategy =
  | 'unlimited'         // ⚠️ 无限制
  | 'fixed_tokens'      // ⚠️ 固定 Token
  | 'fixed_usd'         // ⚠️ 固定 USD
  | 'adaptive';         // ⚠️ 自适应

/**
 * 预算续期类型
 *
 * 来源: 从 BudgetContinuationCount 推导
 * 可信度: 80%
 */
export interface BudgetContinuation {
  continuationCount: number;     // ⚠️ 续期次数
  maxContinuations: number;      // ⚠️ 最大续期次数
  canContinue: boolean;          // ⚠️ 是否可续期
}
