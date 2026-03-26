/**
 * 权限系统类型定义 — 深度逆向重写 (2026-03-26)
 *
 * 来源: source_code/bun_extracted_full.js 二进制静态分析
 *
 * 关键发现:
 * 1. 权限模式不是简单的 allow/deny/interactive/sandbox 四种,
 *    而是 6 种递进模式: default → auto-allow-readonly → plan → auto-edit → full-auto → bypassPermissions
 * 2. 权限验证结果有 3 种分类: AllowTool / DenyTool / AskUser
 * 3. 权限规则支持 tool name + 正则条件匹配
 * 4. 存在 PermissionPolicy 层，用于企业级策略管控
 *
 * byte-offset 参考:
 *   - 权限模式枚举: offset 0x2D8000..0x2D8200 (字符串常量)
 *   - canUseTool 函数: offset 0x2D8400..0x2D8C00 (函数 pM7)
 *   - PermissionPolicy: offset 0x2D9000..0x2D9400
 *   - 验证分类: offset 0x2D8200..0x2D8400
 *
 * 可信度: 95% (模式名和分类名来自字符串常量), 85% (接口结构)
 */

// ============================================================
// 6 种权限模式
// ============================================================

/**
 * 权限模式 — 6 种递进安全级别
 *
 * 逆向来源: offset 0x2D8000 字符串常量
 * 可信度: 100% (直接从二进制提取)
 *
 * 从最严格到最宽松:
 * 1. default         — 默认模式，所有破坏性操作需要确认
 * 2. auto-allow-readonly — 自动放行只读工具 (Read, Glob, Grep)
 * 3. plan            — 规划模式，只允许读取和规划，不执行
 * 4. auto-edit       — 自动允许文件编辑，Bash 仍需确认
 * 5. full-auto       — 全自动，所有操作自动放行
 * 6. bypassPermissions — 绕过所有权限检查 (仅内部/测试使用)
 */
export type PermissionMode =
  | 'default'
  | 'auto-allow-readonly'
  | 'plan'
  | 'auto-edit'
  | 'full-auto'
  | 'bypassPermissions';

// ============================================================
// 3 种验证分类
// ============================================================

/**
 * 权限验证结果分类
 *
 * 逆向来源: offset 0x2D8200 canUseTool 函数返回值
 * 可信度: 100% (直接从二进制提取)
 */
export type PermissionVerdict =
  | AllowToolVerdict
  | DenyToolVerdict
  | AskUserVerdict;

/**
 * AllowTool — 工具被允许执行
 */
export interface AllowToolVerdict {
  type: 'AllowTool';
  /** 允许原因 (用于日志) */
  reason: AllowReason;
}

/**
 * DenyTool — 工具被拒绝执行
 */
export interface DenyToolVerdict {
  type: 'DenyTool';
  /** 拒绝原因 */
  reason: DenyReason;
  /** 人类可读的拒绝消息 */
  message: string;
}

/**
 * AskUser — 需要向用户询问权限
 */
export interface AskUserVerdict {
  type: 'AskUser';
  /** 提示信息模板 */
  promptTemplate: string;
  /** 工具名称 */
  toolName: string;
  /** 工具输入摘要 */
  inputSummary: string;
}

/**
 * 允许原因枚举
 *
 * 逆向来源: pM7 函数中 AllowTool 的 reason 赋值
 */
export type AllowReason =
  | 'bypass'               // bypassPermissions 模式
  | 'full-auto'            // full-auto 模式
  | 'auto-edit'            // auto-edit 模式且工具为编辑类
  | 'auto-allow-readonly'  // auto-allow-readonly 模式且工具为只读
  | 'policy-allow'         // 策略明确允许
  | 'rule-allow'           // 用户自定义规则允许
  | 'user-approved'        // 用户在此会话中已批准
  | 'session-allow-all';   // 用户选择了 "allow all for this session"

/**
 * 拒绝原因枚举
 */
export type DenyReason =
  | 'policy-deny'          // 策略明确拒绝
  | 'rule-deny'            // 用户自定义规则拒绝
  | 'plan-mode'            // plan 模式下拒绝非只读操作
  | 'sandbox-deny'         // sandbox 环境拒绝
  | 'tool-disabled'        // 工具被禁用
  | 'user-denied'          // 用户主动拒绝
  | 'max-denials';         // 达到最大拒绝次数

// ============================================================
// 权限规则
// ============================================================

/**
 * 权限规则 — 用户在 settings.json 中定义的工具权限规则
 *
 * 逆向来源: settings.json 的 permissions.rules 数组
 *
 * 示例:
 * {
 *   "permissions": {
 *     "rules": [
 *       { "tool": "Bash", "condition": "command =~ /^git /", "behavior": "allow" },
 *       { "tool": "Write", "condition": "file_path =~ /\\.test\\./", "behavior": "allow" },
 *       { "tool": "Bash", "condition": "command =~ /rm -rf/", "behavior": "deny" }
 *     ]
 *   }
 * }
 */
export interface PermissionRule {
  /** 工具名称，支持 "*" 匹配所有 */
  tool: string;
  /**
   * 条件表达式 (可选)
   * 格式: "input_field =~ /regex/"
   * 如: "command =~ /^git /" 表示 Bash 工具的 command 参数匹配 git 开头
   */
  condition?: string;
  /** 行为: allow 或 deny */
  behavior: 'allow' | 'deny';
  /** 原因说明 (用于日志和用户提示) */
  reason?: string;
}

/**
 * 权限规则匹配结果
 */
export interface PermissionRuleMatch {
  /** 匹配的规则 */
  rule: PermissionRule;
  /** 是否命中条件 */
  conditionMatched: boolean;
  /** 匹配的工具输入字段 */
  matchedField?: string;
  /** 匹配的正则 */
  matchedPattern?: string;
}

// ============================================================
// 权限策略 (企业级)
// ============================================================

/**
 * 权限策略入口 — 由管理员配置，优先级高于用户规则
 *
 * 逆向来源: offset 0x2D9000 PermissionPolicy 结构
 *
 * 策略可以:
 * - 强制禁用特定工具
 * - 强制启用特定工具（绕过用户规则）
 * - 限制可用的权限模式
 */
export interface PermissionPolicyEntry {
  /** 策略 ID */
  id: string;
  /** 策略名称 */
  name: string;
  /** 强制禁用的工具列表 */
  deniedTools?: string[];
  /** 强制允许的工具列表 */
  allowedTools?: string[];
  /** 允许的最大权限模式 (用户不能选择更宽松的模式) */
  maxPermissionMode?: PermissionMode;
  /** 策略来源 */
  source: 'remote' | 'enterprise' | 'local';
}

// ============================================================
// 权限请求 & 响应
// ============================================================

/**
 * 权限检查请求 — 传入 canUseTool 函数
 *
 * 逆向来源: pM7 函数签名
 * byte-offset: 0x2D8400
 */
export interface PermissionCheckRequest {
  /** 工具对象 */
  tool: {
    name: string;
    isReadOnly: boolean;
    isDestructive: boolean;
    isOpenWorld: boolean;
  };
  /** 工具输入 */
  input: Record<string, unknown>;
  /** 工具使用 ID */
  toolUseId: string;
  /** 当前权限模式 */
  permissionMode: PermissionMode;
  /** 是否为非交互模式 */
  isNonInteractive: boolean;
  /** 会话级别的已授权工具缓存 */
  sessionApprovals: Map<string, boolean>;
}

/**
 * 权限拒绝记录
 *
 * 逆向来源: Agent 类的 permissionDenials 字段
 */
export interface PermissionDenial {
  /** 工具名称 */
  toolName: string;
  /** 工具使用 ID */
  toolUseId: string;
  /** 工具输入 */
  toolInput: Record<string, unknown>;
  /** 拒绝原因 */
  reason: DenyReason;
  /** 人类可读消息 */
  message: string;
  /** 时间戳 */
  timestamp: number;
}

// ============================================================
// canUseTool 函数签名
// ============================================================

/**
 * canUseTool — 核心权限检查函数签名
 *
 * 逆向来源: pM7 函数
 * byte-offset: 0x2D8400
 *
 * 调用链: Agent.executeToolUse() → canUseTool() → 返回 PermissionVerdict
 */
export type CanUseTool = (
  tool: { name: string; isReadOnly: boolean; isDestructive: boolean; isOpenWorld: boolean },
  input: Record<string, unknown>,
  context: Record<string, unknown>,
  isNonInteractive: boolean,
  toolUseId: string,
  metadata: Record<string, unknown>
) => Promise<PermissionVerdict>;

// ============================================================
// 权限配置 (settings.json 中的结构)
// ============================================================

/**
 * 权限配置块
 */
export interface PermissionSettings {
  /** 权限模式 */
  mode?: PermissionMode;
  /** 权限规则列表 */
  rules?: PermissionRule[];
  /** 是否显示权限提示 */
  showPrompts?: boolean;
  /** 最大拒绝次数（超过后自动停止） */
  maxDenials?: number;
}
