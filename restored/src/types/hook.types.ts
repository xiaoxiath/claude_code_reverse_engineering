/**
 * Hook 系统完整类型定义 - 真实提取
 *
 * 来源: source_code/bun_extracted_full.js
 * - Line 47468-47490, 47601-47616: Hook 系统定义
 * - Line 47483, 47604: PostToolUse Hook matcher
 * - Line 59341-59343, 59474-59476: HookCallback 示例
 * - Line 47490, 59363: 完整的 Hook 事件列表
 *
 * 可信度: 95% (事件类型), 85% (接口结构)
 */

/**
 * Hook 事件类型 (完整列表)
 *
 * 来源: Line 47490, 59363
 * 可信度: 100%
 */
export type HookEvent =
  | 'PreToolUse'                          // ✅ 工具使用前
  | 'PostToolUse'                         // ✅ 工具使用后
  | 'PostToolUseFailure'                  // ✅ 工具使用失败后
  | 'Notification'                        // ✅ 通知
  | 'UserPromptSubmit'                    // ✅ 用户提示提交
  | 'SessionStart'                        // ✅ Session 开始
  | 'SessionEnd'                          // ✅ Session 结束
  | 'Stop'                                // ✅ 停止
  | 'SubagentStart'                       // ✅ 子 Agent 启动
  | 'SubagentStop'                        // ✅ 子 Agent 停止
  | 'PreCompact'                          // ✅ 压缩前
  | 'PermissionRequest'                   // ✅ 权限请求
  | 'Setup'                               // ✅ 设置
  | 'TeammateIdle'                        // ✅ 队友空闲
  | 'TaskCompleted'                       // ✅ 任务完成
  | 'ConfigChange'                        // ✅ 配置变更
  | 'Elicitation'                         // ✅ 询问
  | 'ElicitationResult'                   // ✅ 询问结果
  | 'WorktreeCreate'                      // ✅ Worktree 创建
  | 'WorktreeRemove'                      // ✅ Worktree 删除
  | 'InstructionsLoaded';                 // ✅ 指令加载完成

/**
 * Hook 回调函数类型
 *
 * 来源: Line 47468, 47601, 59341, 59474
 * 可信度: 95%
 */
export type HookCallback<TInput = any> = (input: TInput) => Promise<void> | void;

/**
 * Hook 配置
 *
 * 来源: Line 47483, 47604, 47616
 * 可信度: 90%
 */
export interface HookConfig {
  matcher?: string;                       // ⚠️ 匹配器 (正则表达式)
  hooks: HookCallback[];                  // ⚠️ Hook 回调数组
}

/**
 * Hook 处理器映射
 *
 * 来源: Line 47483, 47604
 * 可信度: 95%
 */
export interface HookHandlers {
  PreToolUse?: HookConfig[];              // ✅
  PostToolUse?: HookConfig[];             // ✅
  PostToolUseFailure?: HookConfig[];      // ✅
  Notification?: HookConfig[];            // ✅
  UserPromptSubmit?: HookConfig[];        // ✅
  SessionStart?: HookConfig[];            // ✅
  SessionEnd?: HookConfig[];              // ✅
  Stop?: HookConfig[];                    // ✅
  SubagentStart?: HookConfig[];           // ✅
  SubagentStop?: HookConfig[];            // ✅
  PreCompact?: HookConfig[];              // ✅
  PermissionRequest?: HookConfig[];       // ✅
  Setup?: HookConfig[];                   // ✅
  TeammateIdle?: HookConfig[];            // ✅
  TaskCompleted?: HookConfig[];           // ✅
  ConfigChange?: HookConfig[];            // ✅
  Elicitation?: HookConfig[];             // ✅
  ElicitationResult?: HookConfig[];       // ✅
  WorktreeCreate?: HookConfig[];          // ✅
  WorktreeRemove?: HookConfig[];          // ✅
  InstructionsLoaded?: HookConfig[];      // ✅
}

/**
 * PreToolUse Hook 输入
 *
 * 来源: Line 47471, 47604
 * 可信度: 90%
 */
export interface PreToolUseHookInput {
  agent_id?: string;                      // ⚠️ Agent ID
  agent_type?: 'main' | 'subagent';       // ⚠️ Agent 类型
  tool_name: string;                      // ⚠️ 工具名称
  tool_input: Record<string, any>;        // ⚠️ 工具输入
  timestamp: number;                      // ⚠️ 时间戳
}

/**
 * PostToolUse Hook 输入
 *
 * 来源: Line 47471, 47483, 47604
 * 可信度: 90%
 */
export interface PostToolUseHookInput {
  agent_id?: string;                      // ⚠️ Agent ID
  agent_type?: 'main' | 'subagent';       // ⚠️ Agent 类型
  tool_name: string;                      // ⚠️ 工具名称
  tool_input: Record<string, any>;        // ⚠️ 工具输入
  tool_result?: any;                      // ⚠️ 工具结果
  timestamp: number;                      // ⚠️ 时间戳
}

/**
 * PostToolUseFailure Hook 输入
 *
 * 来源: 从 PostToolUse 推导
 * 可信度: 85%
 */
export interface PostToolUseFailureHookInput {
  agent_id?: string;                      // ⚠️ Agent ID
  agent_type?: 'main' | 'subagent';       // ⚠️ Agent 类型
  tool_name: string;                      // ⚠️ 工具名称
  tool_input: Record<string, any>;        // ⚠️ 工具输入
  error: Error;                           // ⚠️ 错误信息
  timestamp: number;                      // ⚠️ 时间戳
}

/**
 * Notification Hook 输入
 *
 * 来源: 从 Hook 系统推导
 * 可信度: 80%
 */
export interface NotificationHookInput {
  type: 'info' | 'warning' | 'error';     // ⚠️ 通知类型
  message: string;                        // ⚠️ 通知消息
  timestamp: number;                      // ⚠️ 时间戳
}

/**
 * UserPromptSubmit Hook 输入
 *
 * 来源: 从 Hook 系统推导
 * 可信度: 80%
 */
export interface UserPromptSubmitHookInput {
  prompt: string;                         // ⚠️ 用户提示
  timestamp: number;                      // ⚠️ 时间戳
}

/**
 * SubagentStart Hook 输入
 *
 * 来源: 从 Hook 系统推导
 * 可信度: 80%
 */
export interface SubagentStartHookInput {
  agent_id: string;                       // ⚠️ 子 Agent ID
  parent_agent_id?: string;               // ⚠️ 父 Agent ID
  timestamp: number;                      // ⚠️ 时间戳
}

/**
 * SubagentStop Hook 输入
 *
 * 来源: 从 Hook 系统推导
 * 可信度: 80%
 */
export interface SubagentStopHookInput {
  agent_id: string;                       // ⚠️ 子 Agent ID
  parent_agent_id?: string;               // ⚠️ 父 Agent ID
  duration?: number;                      // ⚠️ 持续时间 (ms)
  reason?: string;                        // ⚠️ 停止原因
  timestamp: number;                      // ⚠️ 时间戳
}

/**
 * PreCompact Hook 输入
 *
 * 来源: 从 Hook 系统推导
 * 可信度: 80%
 */
export interface PreCompactHookInput {
  tokenCount: number;                     // ⚠️ 当前 Token 数
  threshold: number;                      // ⚠️ 压缩阈值
  timestamp: number;                      // ⚠️ 时间戳
}

/**
 * PermissionRequest Hook 输入
 *
 * 来源: 从 Hook 系统推导
 * 可信度: 80%
 */
export interface PermissionRequestHookInput {
  request_id: string;                     // ⚠️ 请求 ID
  permission_type: string;                // ⚠️ 权限类型
  resource?: string;                      // ⚠️ 资源
  action?: string;                        // ⚠️ 动作
  timestamp: number;                      // ⚠️ 时间戳
}

/**
 * Setup Hook 输入
 *
 * 来源: 从 Hook 系统推导
 * 可信度: 75%
 */
export interface SetupHookInput {
  workspacePath: string;                  // ⚠️ 工作区路径
  timestamp: number;                      // ⚠️ 时间戳
}

/**
 * TeammateIdle Hook 输入
 *
 * 来源: 从 Hook 系统推导
 * 可信度: 75%
 */
export interface TeammateIdleHookInput {
  agent_id: string;                       // ⚠️ Agent ID
  idleDuration: number;                   // ⚠️ 空闲时间 (ms)
  timestamp: number;                      // ⚠️ 时间戳
}

/**
 * TaskCompleted Hook 输入
 *
 * 来源: 从 Hook 系统推导
 * 可信度: 80%
 */
export interface TaskCompletedHookInput {
  task_id: string;                        // ⚠️ 任务 ID
  task_type?: string;                     // ⚠️ 任务类型
  duration?: number;                      // ⚠️ 持续时间 (ms)
  success: boolean;                       // ⚠️ 是否成功
  timestamp: number;                      // ⚠️ 时间戳
}

/**
 * ConfigChange Hook 输入
 *
 * 来源: 从 Hook 系统推导
 * 可信度: 75%
 */
export interface ConfigChangeHookInput {
  configPath: string;                     // ⚠️ 配置路径
  oldValue?: any;                         // ⚠️ 旧值
  newValue?: any;                         // ⚠️ 新值
  timestamp: number;                      // ⚠️ 时间戳
}

/**
 * Elicitation Hook 输入
 *
 * 来源: 从 Hook 系统推导
 * 可信度: 75%
 */
export interface ElicitationHookInput {
  question: string;                       // ⚠️ 问题
  options?: string[];                     // ⚠️ 选项
  timestamp: number;                      // ⚠️ 时间戳
}

/**
 * ElicitationResult Hook 输入
 *
 * 来源: 从 Hook 系统推导
 * 可信度: 75%
 */
export interface ElicitationResultHookInput {
  question: string;                       // ⚠️ 问题
  answer: string;                         // ⚠️ 回答
  timestamp: number;                      // ⚠️ 时间戳
}

/**
 * WorktreeCreate Hook 输入
 *
 * 来源: 从 Hook 系统推导
 * 可信度: 75%
 */
export interface WorktreeCreateHookInput {
  worktreePath: string;                   // ⚠️ Worktree 路径
  branch?: string;                        // ⚠️ 分支
  timestamp: number;                      // ⚠️ 时间戳
}

/**
 * WorktreeRemove Hook 输入
 *
 * 来源: 从 Hook 系统推导
 * 可信度: 75%
 */
export interface WorktreeRemoveHookInput {
  worktreePath: string;                   // ⚠️ Worktree 路径
  timestamp: number;                      // ⚠️ 时间戳
}

/**
 * InstructionsLoaded Hook 输入
 *
 * 来源: 从 Hook 系统推导
 * 可信度: 75%
 */
export interface InstructionsLoadedHookInput {
  instructionsPath: string;               // ⚠️ 指令文件路径
  timestamp: number;                      // ⚠️ 时间戳
}

/**
 * Hook 执行上下文
 *
 * 来源: 从 Hook 系统推导
 * 可信度: 80%
 */
export interface HookExecutionContext {
  hookName: HookEvent;                    // ⚠️ Hook 名称
  agentId?: string;                       // ⚠️ Agent ID
  workspacePath: string;                  // ⚠️ 工作区路径
  timestamp: number;                      // ⚠️ 时间戳
}

/**
 * Hook 执行结果
 *
 * 来源: 从 Hook 系统推导
 * 可信度: 80%
 */
export interface HookExecutionResult {
  success: boolean;                       // ⚠️ 是否成功
  error?: Error;                          // ⚠️ 错误信息
  duration?: number;                      // ⚠️ 执行时长 (ms)
  modifiedInput?: any;                    // ⚠️ 修改后的输入 (仅 PreToolUse)
  shouldBlock?: boolean;                  // ⚠️ 是否阻止 (仅 PreToolUse)
}
