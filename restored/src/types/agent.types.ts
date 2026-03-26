/**
 * Agent 系统类型定义 - 真实提取
 *
 * 来源: source_code/bun_extracted_full.js
 * - Line 20240, 20312: extractAgentOptions
 * - Line 46404, 46418: Agent 工具说明
 * - Line 47087-47091: ClaudeAgentOptions
 * - Line 47114-47117: Agent SDK 示例
 * - Line 47489: agent_id, agent_type
 * - Line 47510, 59383: AgentDefinition
 * - Line 48540: Agent 类定义 (Sp9)
 * - Line 48844: subagent_type
 *
 * 可信度: 90% (类型名称), 80% (接口结构)
 */

/**
 * Agent 类型
 *
 * 来源: Line 47489
 * 可信度: 100%
 */
export type AgentType =
  | 'main'                                // ✅ 主 Agent
  | 'subagent';                           // ✅ 子 Agent

/**
 * Agent ID 格式
 *
 * 来源: Line 47489
 * 可信度: 100%
 */
export type AgentId = string;

/**
 * Agent 选项
 *
 * 来源: Line 20240, 20312, 47087-47091
 * 可信度: 90%
 */
export interface AgentOptions {
  // ✅ Agent ID
  agent_id?: AgentId;                     // ✅ Line 47489

  // ✅ Agent 类型
  agent_type?: AgentType;                 // ✅ Line 47489

  // ⚠️ 允许的工具
  allowedTools?: string[];                // ✅ Line 47091

  // ⚠️ 拒绝的工具
  deniedTools?: string[];                 // ⚠️

  // ⚠️ 系统提示
  systemPrompt?: string;                  // ⚠️

  // ⚠️ 最大轮次
  maxTurns?: number;                      // ⚠️

  // ⚠️ 最大预算
  maxBudgetUsd?: number;                  // ⚠️

  // ⚠️ 子 Agent 类型
  subagent_type?: SubagentType;           // ✅ Line 48844
}

/**
 * Claude Agent 选项 (SDK)
 *
 * 来源: Line 47087-47091, 47114-47117
 * 可信度: 95%
 */
export interface ClaudeAgentOptions {
  // ✅ 允许的工具
  allowed_tools?: string[];               // ✅ Line 47091

  // ⚠️ 其他选项
  max_turns?: number;                     // ⚠️
  max_budget_usd?: number;                // ⚠️
  system_prompt?: string;                 // ⚠️
}

/**
 * 子 Agent 类型
 *
 * 来源: Line 46404, 48844, 48540
 * 可信度: 90%
 */
export type SubagentType =
  | 'general-purpose'                     // ⚠️ 通用 Agent
  | 'statusline-setup'                    // ⚠️ Statusline 设置
  | 'Explore'                             // ⚠️ 探索 Agent
  | 'Plan'                                // ⚠️ 计划 Agent
  | 'claude-code-guide';                  // ⚠️ Claude Code 指南

/**
 * Agent 定义
 *
 * 来源: Line 47510, 59383
 * 可信度: 90%
 */
export interface AgentDefinition {
  // ⚠️ 基本字段
  name: string;                           // ⚠️
  type?: SubagentType;                    // ⚠️
  description?: string;                   // ⚠️

  // ⚠️ 配置字段
  systemPrompt?: string;                  // ⚠️
  allowedTools?: string[];                // ⚠️
  deniedTools?: string[];                 // ⚠️
  maxTurns?: number;                      // ⚠️
  maxBudgetUsd?: number;                  // ⚠️

  // ⚠️ 高级配置
  model?: string;                         // ⚠️ 模型
  temperature?: number;                   // ⚠️ 温度
}

/**
 * Agent 状态
 *
 * 来源: Line 48540 (Agent class Sp9)
 * 可信度: 85%
 */
export enum AgentState {
  IDLE = 'IDLE',                          // ⚠️ 空闲
  PROCESSING = 'PROCESSING',              // ⚠️ 处理中
  CHECKING_PERMISSION = 'CHECKING_PERMISSION',  // ⚠️ 检查权限
  EXECUTING_TOOL = 'EXECUTING_TOOL',      // ⚠️ 执行工具
  SENDING_RESULT = 'SENDING_RESULT',      // ⚠️ 发送结果
  RESPONDING = 'RESPONDING',              // ⚠️ 响应中
  COMPLETED = 'COMPLETED',                // ⚠️ 已完成
  ERROR = 'ERROR'                         // ⚠️ 错误
}

/**
 * Agent 上下文
 *
 * 来源: 从 Agent 系统推导
 * 可信度: 80%
 */
export interface AgentContext {
  agentId: AgentId;                       // ⚠️ Agent ID
  agentType: AgentType;                   // ⚠️ Agent 类型
  parentAgentId?: AgentId;                // ⚠️ 父 Agent ID
  workspacePath: string;                  // ⚠️ 工作区路径
  sessionId?: string;                     // ⚠️ Session ID
  timestamp: number;                      // ⚠️ 时间戳
}

/**
 * Agent 执行结果
 *
 * 来源: Line 47087, 47114
 * 可信度: 85%
 */
export interface AgentResult {
  agentId: AgentId;                       // ⚠️ Agent ID
  success: boolean;                       // ⚠️ 是否成功
  result?: any;                           // ⚠️ 结果
  error?: Error;                          // ⚠️ 错误
  duration?: number;                      // ⚠️ 持续时间 (ms)
  tokenUsage?: TokenUsage;                // ⚠️ Token 使用
}

/**
 * Agent 消息
 *
 * 来源: 从消息系统推导
 * 可信度: 80%
 */
export interface AgentMessage {
  agentId: AgentId;                       // ⚠️ Agent ID
  role: 'user' | 'assistant' | 'system';  // ⚠️ 角色
  content: string | ContentBlock[];       // ⚠️ 内容
  timestamp: number;                      // ⚠️ 时间戳
}

/**
 * Agent 事件
 *
 * 来源: 从 Agent 系统推导
 * 可信度: 80%
 */
export type AgentEvent =
  | { type: 'start'; agentId: AgentId }
  | { type: 'message'; message: AgentMessage }
  | { type: 'tool_use'; toolName: string; input: any }
  | { type: 'tool_result'; toolName: string; result: any }
  | { type: 'error'; error: Error }
  | { type: 'complete'; result: AgentResult };

/**
 * Agent 工具提取选项
 *
 * 来源: Line 20240, 20312
 * 可信度: 85%
 */
export interface ExtractAgentOptions {
  (agent: any): AgentOptions;
}

/**
 * Subagent Start Hook 输入
 *
 * 来源: 从 Hook 系统推导
 * 可信度: 80%
 */
export interface SubagentStartHookInput {
  agent_id: AgentId;                      // ⚠️ 子 Agent ID
  parent_agent_id?: AgentId;              // ⚠️ 父 Agent ID
  subagent_type?: SubagentType;           // ⚠️ 子 Agent 类型
  timestamp: number;                      // ⚠️ 时间戳
}

/**
 * Subagent Stop Hook 输入
 *
 * 来源: 从 Hook 系统推导
 * 可信度: 80%
 */
export interface SubagentStopHookInput {
  agent_id: AgentId;                      // ⚠️ 子 Agent ID
  parent_agent_id?: AgentId;              // ⚠️ 父 Agent ID
  subagent_type?: SubagentType;           // ⚠️ 子 Agent 类型
  duration?: number;                      // ⚠️ 持续时间 (ms)
  reason?: string;                        // ⚠️ 停止原因
  timestamp: number;                      // ⚠️ 时间戳
}

/**
 * Agent 类 (Sp9)
 *
 * 来源: Line 48540
 * 可信度: 80%
 */
export interface Agent {
  // ⚠️ Agent 字段
  agentId: AgentId;                       // ⚠️
  agentType: AgentType;                   // ⚠️
  state: AgentState;                      // ⚠️

  // ⚠️ Agent 方法
  start(options?: AgentOptions): Promise<void>;  // ⚠️
  stop(): Promise<void>;                  // ⚠️
  sendMessage(message: AgentMessage): Promise<void>;  // ⚠️
  getState(): AgentState;                 // ⚠️
}

/**
 * Agent 管理器
 *
 * 来源: 从 Agent 系统推导
 * 可信度: 80%
 */
export interface AgentManager {
  // ⚠️ 创建 Agent
  createAgent(definition: AgentDefinition): Promise<Agent>;

  // ⚠️ 获取 Agent
  getAgent(agentId: AgentId): Promise<Agent | undefined>;

  // ⚠️ 列出 Agents
  listAgents(): Promise<Agent[]>;

  // ⚠️ 终止 Agent
  terminateAgent(agentId: AgentId): Promise<void>;

  // ⚠️ 发送消息到 Agent
  sendMessage(agentId: AgentId, message: AgentMessage): Promise<void>;
}
