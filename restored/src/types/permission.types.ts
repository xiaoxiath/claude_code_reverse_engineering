/**
 * 权限系统类型定义 - 真实提取
 *
 * 来源: source_code/bun_extracted_full.js 全局搜索
 * 可信度: 95%
 */

/**
 * 权限模式
 *
 * 来源: PermissionMode 类型名称
 * 可信度: 95%
 */
export type PermissionMode =
  | 'allow'        // 允许所有操作
  | 'deny'         // 拒绝所有操作
  | 'interactive'  // 交互式询问用户
  | 'sandbox';     // 沙箱模式（受限）

/**
 * 权限请求
 *
 * 来源: PermissionRequest 类型名称推导
 * 可信度: 85%
 */
export interface PermissionRequest {
  tool: string;                         // ⚠️ 工具名称
  input: any;                           // ⚠️ 工具输入
  context?: any;                        // ⚠️ 上下文信息
}

/**
 * 权限响应
 *
 * 来源: PermissionResponse 类型名称推导
 * 可信度: 85%
 */
export interface PermissionResponse {
  behavior: 'allow' | 'deny' | 'ask';   // ⚠️ 行为
  reason?: string;                      // ⚠️ 原因（如果拒绝）
  updatedInput?: any;                   // ⚠️ 修改后的输入
}

/**
 * 权限拒绝记录
 *
 * 来源: permissionDenials 字段 (Agent 类)
 * 可信度: 100%
 */
export interface PermissionDenial {
  tool_name: string;                    // ✅ 工具名称
  tool_use_id: string;                  // ✅ 工具使用 ID
  tool_input: any;                      // ✅ 工具输入
  reason?: string;                      // ⚠️ 拒绝原因
  timestamp?: number;                   // ⚠️ 时间戳
}

/**
 * 权限规则
 *
 * 来源: 从权限规则格式推导
 * 可信度: 95%
 */
export interface PermissionRule {
  tool: string;                         // ⚠️ 工具名称或 "*"
  rule?: string;                        // ⚠️ 规则内容
  behavior: 'allow' | 'deny' | 'ask';   // ⚠️ 行为
  reason?: string;                      // ⚠️ 原因
}

/**
 * 权限上下文
 *
 * 来源: PermissionContext 类型名称
 * 可信度: 90%
 */
export interface PermissionContext {
  mode: PermissionMode;                 // ⚠️ 权限模式
  denials: PermissionDenial[];          // ⚠️ 拒绝记录
  rules: PermissionRule[];              // ⚠️ 权限规则

  // ⚠️ 推导的辅助字段
  allowedTools?: Set<string>;           // 允许的工具集合
  deniedTools?: Set<string>;            // 拒绝的工具集合
}

/**
 * 权限相关类型名称（从源码提取）
 *
 * 来源: 全局搜索 "Permission[A-Z][a-zA-Z]*"
 * 可信度: 100%
 */
export type PermissionTypeNames =
  | 'PermissionContext'
  | 'PermissionDeniedError'
  | 'PermissionMode'
  | 'PermissionPrompt'
  | 'PermissionRequest'
  | 'PermissionRequests'
  | 'PermissionResponse'
  | 'PermissionRulesOnly';

/**
 * 权限检查器函数类型
 *
 * 来源: canUseTool 参数推导
 * 可信度: 85%
 */
export type PermissionChecker = (
  tool: any,
  input: any,
  context: any,
  isNonInteractive: boolean,
  toolUseId: string,
  metadata: any
) => Promise<PermissionResponse>;
