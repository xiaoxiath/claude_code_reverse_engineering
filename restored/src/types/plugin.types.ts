/**
 * 插件系统类型定义 - 真实提取
 *
 * 来源: source_code/bun_extracted_full.js 全局搜索
 * 可信度: 95% (类型名称), 70% (Schema 定义)
 */

/**
 * 插件 Hook 事件类型
 *
 * 来源: 从 Hook 系统提取
 * 可信度: 100%
 */
export type PluginHookEvent =
  | 'PreToolUse'
  | 'PostToolUse'
  | 'Notification'
  | 'UserPromptSubmit'
  | 'SessionStart'
  | 'SessionEnd'
  | 'Stop'
  | 'SubagentStop'
  | 'PreCompact'
  | 'PostCompact'
  | 'TeammateIdle'
  | 'TaskCompleted';

/**
 * 插件 Hook 处理器
 *
 * 来源: 从 Hook 系统推导
 * 可信度: 80%
 */
export type PluginHookHandler = (
  event: any,
  context: PluginContext
) => Promise<void> | void;

/**
 * 插件配置
 *
 * 来源: 从 pluginConfigs 字段推导
 * 可信度: 85%
 */
export interface PluginConfig {
  pluginId: string;                     // ⚠️ 插件 ID
  enabled: boolean;                     // ⚠️ 是否启用
  trustLevel?: 'trusted' | 'untrusted'; // ⚠️ 信任级别
  hooks?: PluginHooks;                  // ⚠️ Hook 配置
  editableScopes?: string[];            // ⚠️ 可编辑作用域
}

/**
 * 插件 Hooks 配置
 *
 * 来源: PluginHooks 类型名称
 * 可信度: 90%
 */
export interface PluginHooks {
  PreToolUse?: PluginHookHandler[];     // ✅ 工具使用前
  PostToolUse?: PluginHookHandler[];    // ✅ 工具使用后
  Notification?: PluginHookHandler[];   // ✅ 通知
  UserPromptSubmit?: PluginHookHandler[]; // ✅ 用户提示提交
  SessionStart?: PluginHookHandler[];   // ✅ 会话开始
  SessionEnd?: PluginHookHandler[];     // ✅ 会话结束
  Stop?: PluginHookHandler[];           // ✅ 停止
  SubagentStop?: PluginHookHandler[];   // ✅ 子 Agent 停止
  PreCompact?: PluginHookHandler[];     // ✅ 压缩前
  PostCompact?: PluginHookHandler[];    // ✅ 压缩后
  TeammateIdle?: PluginHookHandler[];   // ✅ 队友空闲
  TaskCompleted?: PluginHookHandler[];  // ✅ 任务完成
}

/**
 * 插件元数据
 *
 * 来源: PluginMarketplaceSchema 推导
 * 可信度: 75%
 */
export interface PluginMetadata {
  id: string;                           // ⚠️ 插件 ID
  name: string;                         // ⚠️ 插件名称
  version: string;                      // ⚠️ 版本号
  description?: string;                 // ⚠️ 描述
  author?: string;                      // ⚠️ 作者
  homepage?: string;                    // ⚠️ 主页
  repository?: string;                  // ⚠️ 代码仓库
  license?: string;                     // ⚠️ 许可证
  keywords?: string[];                  // ⚠️ 关键词
  dependencies?: string[];              // ⚠️ 依赖
}

/**
 * 插件上下文
 *
 * 来源: 从处理器参数推导
 * 可信度: 80%
 */
export interface PluginContext {
  pluginId: string;                     // ⚠️ 插件 ID
  config: PluginConfig;                 // ⚠️ 插件配置
  logger?: any;                         // ⚠️ 日志器
  workspacePath: string;                // ⚠️ 工作区路径
}

/**
 * 插件处理器函数类型
 *
 * 来源: 从处理器名称提取
 * 可信度: 100%
 */
export type PluginHandler<T = any> = (params: T) => Promise<any>;

/**
 * 插件系统 API
 *
 * 来源: 从处理器名称提取
 * 可信度: 95%
 */
export interface PluginSystemAPI {
  // ✅ 提取的处理器
  pluginValidateHandler: PluginHandler;     // 验证插件
  pluginInstallHandler: PluginHandler;      // 安装插件
  pluginEnableHandler: PluginHandler;       // 启用插件
  pluginDisableHandler: PluginHandler;      // 禁用插件
  pluginUpdateHandler: PluginHandler;       // 更新插件
  pluginUninstallHandler: PluginHandler;    // 卸载插件
  pluginListHandler: PluginHandler;         // 列出插件
}

/**
 * 插件相关类型名称（从源码提取）
 *
 * 来源: 全局搜索 "Plugin[A-Z][a-zA-Z]*"
 * 可信度: 100%
 */
export type PluginTypeNames =
  | 'PluginEditableScopes'
  | 'PluginHookHotReload'
  | 'PluginHooks'
  | 'PluginInstall'
  | 'PluginMarketplaceSchema'
  | 'PluginOnlyCustomization';
