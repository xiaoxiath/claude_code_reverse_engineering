/**
 * 状态系统类型定义 - 真实提取
 *
 * 来源: source_code/bun_extracted_full.js 全局搜索
 * 可信度: 100% (类型名称), 80% (状态定义)
 */

/**
 * Agent 状态枚举
 *
 * 来源: 基于状态类和字段使用推导
 * 可信度: 80%
 */
export enum AgentState {
  IDLE = 'IDLE',                         // 空闲
  PROCESSING = 'PROCESSING',             // 处理中
  CHECKING_PERMISSION = 'CHECKING_PERMISSION',  // 检查权限
  EXECUTING_TOOL = 'EXECUTING_TOOL',     // 执行工具
  SENDING_RESULT = 'SENDING_RESULT',     // 发送结果
  RESPONDING = 'RESPONDING',             // 响应中
  COMPLETED = 'COMPLETED',               // 已完成
  ERROR = 'ERROR'                        // 错误
}

/**
 * 状态和成本
 *
 * 来源: StateAndCost 类型名称
 * 可信度: 90%
 */
export interface StateAndCost {
  state: AgentState;                    // ⚠️ 当前状态
  cost: number;                         // ⚠️ 状态成本（时间或资源）
  tokens?: number;                      // ⚠️ Token 数量
}

/**
 * 状态变更事件
 *
 * 来源: StateChange 类型名称
 * 可信度: 85%
 */
export interface StateChangeEvent {
  previousState: AgentState;            // ⚠️ 之前的状态
  currentState: AgentState;             // ⚠️ 当前状态
  timestamp: number;                    // ⚠️ 时间戳
  reason?: string;                      // ⚠️ 变更原因
}

/**
 * 状态更新
 *
 * 来源: StateUpdate 类型名称
 * 可信度: 85%
 */
export interface StateUpdate {
  state: AgentState;                    // ⚠️ 新状态
  metadata?: any;                       // ⚠️ 附加元数据
}

/**
 * 状态错误
 *
 * 来源: StateError 类型名称
 * 可信度: 90%
 */
export interface StateError {
  state: AgentState;                    // ⚠️ 错误发生时的状态
  error: Error;                         // ⚠️ 错误对象
  recoverable: boolean;                 // ⚠️ 是否可恢复
}

/**
 * 恢复状态
 *
 * 来源: StateForRestore 类型名称
 * 可信度: 85%
 */
export interface StateForRestore {
  state: AgentState;                    // ⚠️ 要恢复的状态
  context: any;                         // ⚠️ 恢复上下文
  timestamp: number;                    // ⚠️ 保存时间戳
}

/**
 * 状态相关类型名称（从源码提取）
 *
 * 来源: 全局搜索 "State[A-Z][a-zA-Z]*"
 * 可信度: 100%
 */
export type StateTypeNames =
  | 'StateAndCost'
  | 'StateChange'
  | 'StateError'
  | 'StateException'
  | 'StateForIssue'
  | 'StateForJSCall'
  | 'StateForRestore'
  | 'StateForTests'
  | 'StateFromError'
  | 'StateFromProps'
  | 'StateImpl'
  | 'StateIssue'
  | 'StateMask'
  | 'StatePending'
  | 'StateProbability'
  | 'StateRejected'
  | 'StateSentOrAssigned'
  | 'StateSymbol'
  | 'StateType'
  | 'StateUpdate';

/**
 * 状态转换映射
 *
 * 来源: 基于状态类推导
 * 可信度: 70%
 */
export type StateTransitions = {
  [state in AgentState]: AgentState[];
};
