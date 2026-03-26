# Claude Code v2.1.83 深度逆向分析报告

> **分析目标**: `claude_code_agent.js` (~4.2MB, 15325行, minified/bundled JavaScript)
> **构建时间**: 2026-03-25T05:15:24Z
> **包名**: `@anthropic-ai/claude-code`
> **分析方法**: 纯静态文本分析（正则匹配 + 位置提取 + 交叉引用）
> **置信度标注**: [CONFIRMED] = 从代码直接提取; [INFERRED] = 从调用点/上下文推断; [SPECULATIVE] = 合理推测

---

## 1. 文件结构与 Bundler Runtime

### 1.1 基本信息

| 属性 | 值 |
|------|------|
| 包名 | `@anthropic-ai/claude-code` |
| 版本 | 2.1.83 |
| 构建时间 | 2026-03-25T05:15:24Z |
| 打包工具 | Bun Bundler |
| JS 核心大小 | ~4.2MB (4,178,570 bytes) |
| 行数 | 15,325 (实为少量超长行, 最长达 187K 字符) |
| 运行时 | Bun (优先) / Node.js |
| 模型支持 | Claude Opus 4.6, Sonnet 4.6, Haiku 4.5 |

### 1.2 Bundler Runtime 模式 [CONFIRMED]

位于文件头部 (offset 654)，定义了三种模块封装模式：

#### `d()` — CommonJS 包装器 (422个模块)

```javascript
var d = (_, T) => () => (T || _((T = {exports: {}}).exports, T), T.exports);
```

- **模式**: `var XYZ = d((exports, module) => { ... })`
- 首次调用时执行工厂函数，之后返回缓存的 `exports`
- 用于第三方库（axios, debug, ws, follow-redirects 等）

#### `M()` — 惰性初始化模块 (606个模块)

```javascript
var M = (_, T) => () => (_ && (T = _(_ = 0)), T);
```

- **模式**: `var XYZ = M(() => { ... })`
- 首次调用时执行，后续返回缓存结果
- 用于项目内部模块
- **这是逆向分析的主要障碍**——关键标识符（tool objects, inner agent loop, permission checkers）在 M() 闭包内赋值，无法通过文本搜索定位

#### `kT()` — 命名导出映射 (41个模块)

```javascript
var kT = (_, T) => {
  for (var q in T)
    m7_(_, q, {get: T[q], enumerable: true, configurable: true, set: vB9.bind(T, q)})
};
```

- **模式**: `var XYZ = {}; kT(XYZ, { exportName: () => localVar, ... })`
- 创建具有 getter 的命名导出对象
- 用于公开 API 表面（如 `ep9` 导出 `runHeadless`, `getCanUseToolFn` 等）

#### 辅助函数

- `x()` — ESM 互操作辅助，处理 `__esModule` 标志
- `p6()` — `__esModule` 标志设置

### 1.3 文件双份结构 [CONFIRMED]

文件包含近乎重复的前后两半（前半 offset 0-~2,089,000; 后半 offset ~2,089,000-4,178,570），中间夹杂 protobuf 模板。两半内容几乎相同，这是 Bun 打包器的已知行为（ESM/CJS 双格式输出）。

---

## 2. 执行层次结构

### 2.1 五层调用链 [CONFIRMED]

```
awO() — runHeadless 导出入口 (位置: 1829577)
  └─ owO() — Headless Runner (位置: 1834804)
       └─ Ep9() — Async Generator Wrapper (位置: 1824749)
            └─ Sp9.submitMessage() — 核心引擎 (位置: 1813028)
                 └─ cS() — 内部对话循环 (phantom, via M() closure)
```

#### awO() — Headless 入口 [CONFIRMED, pos 1829577]

主导出入口 (`runHeadless`)。初始化流程：
1. 沙盒初始化: `Y8.initialize(H.createSandboxAskCallback())`
2. 设置加载
3. MCP 服务器解析
4. 构建工具数组
5. 委托给 `owO()`

#### owO() — Headless Runner [CONFIRMED, pos 1834804]

无头模式运行器，管理外部交互循环：
- SIGINT 信号处理注册
- MCP 客户端生命周期 (`vX7()`, `sp9()`)
- 权限模式管理 (`iX9()`)
- 认证状态订阅
- 速率限制 (`LT_.add(h)`)
- Agent 定义加载 (`vy_()`)
- 主输入循环: `for await (let W_ of _.structuredInput)`
- 对每个 prompt 调用 Ep9()
- 输出格式处理: stream-json / json / text

#### Ep9() — Async Generator Wrapper [CONFIRMED, pos 1824749]

```javascript
// [CONFIRMED] 从代码提取
async function* Ep9({commands, prompt, ...config}) {
  let p = new Sp9({...config...});
  try {
    yield* p.submitMessage(T, {uuid: q, isMeta: K});
  } finally {
    P(p.getReadFileState()); // 保存文件读取缓存
  }
}
```

#### Sp9.submitMessage() — 核心引擎 [CONFIRMED, pos 1813028]

见 Section 4 详细分析。

#### cS() — 内部对话循环 [INFERRED]

**未解之谜**: `cS` 在整个 4MB 文件中仅以调用形式出现 2 次（及其第二半的副本），从未以任何标准形式定义（无 `var cS =`、`function cS`、`let cS =`）。

最可能的解释：在 M() 惰性闭包内部赋值，Bun 打包器的模块连接（module concatenation）期间通过内部机制注入。

从调用签名推断的参数：
```
{messages, systemPrompt, userContext, systemContext, canUseTool, toolUseContext,
 fallbackModel, querySource:"sdk", maxTurns}
```

返回异步可迭代对象，yield 事件类型：
`assistant | user | system | stream_event | attachment | progress | tombstone | stream_request_start | tool_use_summary`

### 2.2 模块地址映射 [CONFIRMED]

| 位置 (byte offset) | 模块 ID | 内容 |
|---|---|---|
| 800705 | dq | 错误类 (ShellError, AbortError, ConfigParseError) |
| 824644 | EJ8 | 文件编码检测 |
| 825303 | HN | 文件 I/O (yo 读取, uw_ 原子写入) |
| 829661 | J7 | 文件系统核心 (path, os, fs) |
| 830463 | M5 | 诊断/性能分析 |
| 831030 | g8q | Shell 封装 (Tq, C8 函数) |
| 832019 | Z9 | 合并 Shell 模块 |
| 833833 | c8q | Git/文件系统操作 |
| 838844 | — | tJ8() worktree 计数 |
| 839300 | BR4 | 二进制文件扩展名集合 |
| 855015 | B28 | 设置管理 |
| 857240 | zb_ | 权限模式定义 |
| 857678 | iD | 权限模式元数据 |
| 858407 | — | Agent 工具名 T9="Agent" |
| 858450 | — | TaskStop prompt 文本 |
| 862704 | Kk8 | 权限验证分类 |
| 866842 | Ok8 | Hook 事件类型定义 |
| 867300 | bA4 | Hook Schema 定义 (4种类型) |
| 897600 | — | Sandbox 配置 Schema |
| 935918 | — | Hook 可配置事件列表 |
| 1139419 | — | undici Agent (mTLS) |
| 1651330 | — | Agent tool prompt/description |
| 1655331 | — | Teammate 限制逻辑 |
| 1655542 | T27 | Sub-agent 模型选择 |
| 1655636 | fh_ | Sub-agent 模型选择函数 |
| 1658699 | TNT | 安全监控 prompt |
| 1666596 | — | Agent prompt 安全检查 |
| 1694777 | fl_ | Auto-mode 分类器 (tengu) |
| 1756513 | — | Hook agent_id/agent_type |
| 1812800 | Lp9/Sp9 | 核心引擎类 |
| 1813028 | — | Sp9.submitMessage() |
| 1819033 | — | cS() 调用点 |
| 1824749 | Ep9 | Async generator wrapper |
| 1829194 | ep9 | Headless 模块导出 |
| 1829577 | awO | runHeadless 入口 |
| 1830703 | — | Sandbox 初始化 |
| 1831025 | Jq7 | Hook 事件监听 (headless) |
| 1833077 | — | MCP 工具合并 |
| 1834804 | owO | Headless Runner |
| 1841027 | — | 工具数组构造 |
| 1880000 | fg9/qYO | MCP server handler |
| 1880934 | — | MCP handler 工具调度 |

---

## 3. 全局状态单例 ZT [CONFIRMED]

所有会话状态的中心枢纽，80+ 字段。通过函数封装访问。

### 3.1 字段分类

| 分类 | 字段 | 说明 | 来源 |
|---|---|---|---|
| **会话管理** | sessionId | `crypto.randomUUID()` | [CONFIRMED] |
| | parentSessionId | 父会话 ID | [CONFIRMED] |
| | isInteractive | 是否交互模式 | [CONFIRMED] |
| | clientType | 客户端类型 | [CONFIRMED] |
| **模型配置** | modelUsage | 模型使用统计 | [CONFIRMED] |
| | mainLoopModelOverride | 主循环模型覆盖 | [CONFIRMED] |
| | initialMainLoopModel | 初始主循环模型 | [CONFIRMED] |
| | modelStrings | 模型字符串集 | [CONFIRMED] |
| **权限系统** | sessionBypassPermissionsMode | 会话级权限绕过 | [CONFIRMED] |
| | registeredHooks | 已注册 hooks | [CONFIRMED] |
| **遥测/监控** | eventLogger | 事件日志 | [CONFIRMED] |
| | costCounter | 费用计数 | [CONFIRMED] |
| | tokenCounter | Token 计数 | [CONFIRMED] |
| | codeEditToolDecisionCounter | 编辑工具决策计数 | [CONFIRMED] |
| | inMemoryErrorLog | 内存错误日志 | [CONFIRMED] |
| | slowOperations | 慢操作追踪 | [CONFIRMED] |
| **API 缓存** | lastAPIRequest | 最后 API 请求 | [CONFIRMED] |
| | lastAPIRequestMessages | 最后请求消息 | [CONFIRMED] |
| | cachedClaudeMdContent | 缓存的 CLAUDE.md | [CONFIRMED] |
| **MCP** | invokedSkills | 已调用技能 | [CONFIRMED] |
| | inlinePlugins | 内联插件 | [CONFIRMED] |
| **上下文** | systemPromptSectionCache | System Prompt 分段缓存 | [CONFIRMED] |
| | pendingPostCompaction | 待处理压缩后操作 | [CONFIRMED] |
| | promptCache1hAllowlist | 1小时缓存白名单 | [CONFIRMED] |

### 3.2 访问封装 [CONFIRMED]

| 函数 | 用途 |
|------|------|
| `yM()` | → `ZT.isInteractive` |
| `VT()` | → `ZT.sessionId` |
| `gD()` | → 总花费 USD |
| `gE()` | → 按模型分类的 usage |
| `F8_()` | → 累加单次 usage |
| `GmT()` | → 合并到总 usage |

### 3.3 请求作用域状态: AsyncLocalStorage `l8` [CONFIRMED]

```javascript
x9T()  // → 以 store 运行代码
u9T()  // → 获取当前 store
MT()   // → 获取当前 store (别名)
```

基于 Node.js `async_hooks.AsyncLocalStorage`，为每个请求提供隔离的上下文。

---

## 4. Agent 主类 Sp9 [CONFIRMED]

### 4.1 核心属性

```typescript
// [CONFIRMED] 从代码结构提取
class Sp9 {
  config: AgentConfig;          // cwd, commands, tools, mcpClients, thinkingConfig, maxTurns
  mutableMessages: Message[];   // 可变消息历史
  abortController: AbortController;
  permissionDenials: Map<string, PermissionDenial>;
  totalUsage: TokenUsage;
  readFileState: Map<string, FileState>;
  discoveredSkillNames: Set<string>;
}
```

### 4.2 AgentConfig 结构 [INFERRED]

```typescript
interface AgentConfig {
  cwd: string;
  commands: Command[];
  tools: Tool[];
  mcpClients: McpClient[];
  thinkingConfig: ThinkingConfig;
  maxTurns: number;
  maxBudgetUsd?: number;
  canUseTool: CanUseToolFunction;
}
```

### 4.3 submitMessage() 执行流程 [CONFIRMED]

1. **配置解构**：从 `this.config` 提取 cwd, commands, tools, mcpClients, thinkingConfig, maxTurns, maxBudgetUsd, canUseTool
2. **模型选择**：`u = Y ? a9(Y) : H4()` — 用户指定模型或默认模型
3. **思考配置**：adaptive (如启用) 或 disabled
4. **System Prompt 构建**：`OD()` 并行构建 + `V5()` 配置 + `jH()` 上下文
5. **输入预处理**：`vFT()` → `{messages, shouldQuery, allowedTools, model, resultText}`
6. **Skills/Plugins 加载**：`q3_()` + `ww()` 并行
7. **初始消息发送**：`RUT()` yield 初始系统事件
8. **非查询快速路径**：如 `!shouldQuery`，直接返回
9. **主对话循环**：`for await (let A_ of cS({...}))`
10. **事件分发与终止检测**

### 4.4 事件处理管道 [CONFIRMED]

| 事件类型 | 处理逻辑 |
|---|---|
| `assistant` | 记录 stop_reason, push 到消息历史, yield 给调用者 |
| `user` | 增加 turn 计数, push 到消息历史, yield 给调用者 |
| `stream_event` | 根据子类型处理 (见 Section 5.3) |
| `attachment` | 处理子类型: `structured_output`, `max_turns_reached`, `queued_command` |
| `system` | 处理子类型: `compact_boundary`, `api_error` |
| `progress` | push 到消息历史, yield 给调用者 |
| `tool_use_summary` | yield 摘要信息 |
| `tombstone` | 静默跳过 |
| `stream_request_start` | 静默跳过 |

### 4.5 结果类型 [CONFIRMED]

| 子类型 | 含义 |
|---|---|
| `success` | 正常完成 |
| `error_max_turns` | 达到最大轮数 |
| `error_max_budget_usd` | 达到预算上限 |
| `error_max_structured_output_retries` | 结构化输出重试耗尽 |
| `error_during_execution` | 执行期间错误 |

每个结果包含: `duration_ms`, `duration_api_ms`, `num_turns`, `stop_reason`, `total_cost_usd`, `usage`, `modelUsage`, `permission_denials`, `fast_mode_state`

---

## 5. API 交互层

### 5.1 多 Provider 路由 [CONFIRMED]

```javascript
function p8(): string {
  if (env.CLAUDE_CODE_USE_BEDROCK)  return "bedrock";
  if (env.CLAUDE_CODE_USE_VERTEX)   return "vertex";
  if (env.CLAUDE_CODE_USE_FOUNDRY)  return "foundry";
  return "firstParty";
}
```

| 提供者 | 环境变量 | 端点 |
|---|---|---|
| firstParty | (默认) | api.anthropic.com |
| bedrock | `CLAUDE_CODE_USE_BEDROCK` | AWS Bedrock |
| vertex | `CLAUDE_CODE_USE_VERTEX` | Google Vertex AI |
| foundry | `CLAUDE_CODE_USE_FOUNDRY` | ByteDance Foundry |

### 5.2 认证 [CONFIRMED]

| 方式 | 细节 |
|---|---|
| OAuth 2.0 | CLIENT_ID: `9d1c250a-e61b-44d9-88ed-5944d1962f5e` |
| | 授权URL: `https://platform.claude.com/oauth/authorize` |
| | Token URL: `https://platform.claude.com/v1/oauth/token` |
| | API Key 创建: `https://api.anthropic.com/api/oauth/claude_cli/create_api_key` |
| API Key | `ANTHROPIC_API_KEY` 环境变量 |
| mTLS | `CLAUDE_CODE_CLIENT_CERT` / `CLAUDE_CODE_CLIENT_KEY` |
| MCP Proxy | `https://mcp-proxy.anthropic.com` |

### 5.3 SSE 流式响应处理 [CONFIRMED]

```
message_start     → 重置 token 计数器 (T_ = ek), 初始化 usage 追踪
content_block_start → 新内容块 (text/tool_use)
content_block_delta → 增量内容
content_block_stop  → 终结内容块
message_delta      → stop_reason + 最终 usage
message_stop       → GmT() 合并到 totalUsage
```

### 5.4 错误处理 [CONFIRMED]

- SDK 重试: `max_retries=2`
- HTTP 429/529 → 指数退避
- 预算超限 → `error_max_budget_usd`
- 轮数超限 → `error_max_turns`

### 5.5 HTTP 客户端层 [CONFIRMED]

| 层级 | 用途 |
|---|---|
| `globalThis.fetch` | 主 HTTP 客户端 (Bun 原生) |
| undici Agent (offset ~1139419) | TLS/mTLS 支持，客户端证书 |
| Axios (`fw_` 模块) | GrowthBook 功能标记等辅助 HTTP 调用 |
| follow-redirects (offset ~698K) | 重定向处理 |

### 5.6 Vertex 区域映射 [CONFIRMED]

```
claude-haiku-4-5     → VERTEX_REGION_CLAUDE_HAIKU_4_5
claude-3-5-haiku     → VERTEX_REGION_CLAUDE_3_5_HAIKU
claude-3-5-sonnet    → VERTEX_REGION_CLAUDE_3_5_SONNET
claude-3-7-sonnet    → VERTEX_REGION_CLAUDE_3_7_SONNET
claude-opus-4-1      → VERTEX_REGION_CLAUDE_4_1_OPUS
claude-opus-4-6      → VERTEX_REGION_CLAUDE_OPUS_4_6
claude-sonnet-4-6    → VERTEX_REGION_CLAUDE_SONNET_4_6
```

---

## 6. Token 与 Context 管理

### 6.1 三层 Token 计数 [CONFIRMED]

| 层级 | 方式 | 精度 |
|---|---|---|
| 快速估算 | `字符数/4`，图片固定1600 | 低 |
| 精确计数 | `count_tokens` API | 高 |
| 真实统计 | API 响应 `usage` 字段 | 精确 |

### 6.2 MCP 输出截断 [INFERRED]

- `MAX_MCP_OUTPUT_TOKENS` = 25000 (默认，可环境变量覆盖)
- 预检阈值: `25000 * 0.5 = 12500` (快速放行)
- 字符截断: `25000 * 4 = 100000`

### 6.3 Server-Side Compaction (关键发现) [CONFIRMED]

Claude Code **不在客户端做消息裁剪**，使用 Anthropic API `compact-2026-01-12` Beta：

1. 接近 200K context window 时，服务端自动压缩早期上下文
2. 返回 `compact_boundary` 系统消息，含 `compactMetadata`
3. 客户端处理流程：
   - 检查 `preservedSegment.tailUuid`
   - 找到边界索引 `b_`
   - `this.mutableMessages.splice(0, b_)` — 截断边界之前的消息
   - 设置 `ZT.pendingPostCompaction`
4. 触发 `PreCompact` / `PostCompact` Hook 事件

### 6.4 Prompt Caching [CONFIRMED]

- System Prompt 标记 `cache_control: { type: "ephemeral" }`
- 追踪 `cache_read_input_tokens` 和 `cache_creation_input_tokens`
- `ZT.promptCache1hAllowlist` 管理 1 小时缓存白名单

### 6.5 会话持久化 [CONFIRMED]

- **格式**: JSONL (每行一个 JSON 对象)
- **路径**: `~/.claude/projects/<hash>/memory/`
- **Compact-aware 读取**: `T4T()` 函数检测 `compact_boundary`，自动丢弃之前内容
- **高效检测**: `cO4()` 预编译 Buffer 用于快速查找 `compact_boundary` 标记

---

## 7. 工具系统

### 7.1 工具接口 [CONFIRMED]

```typescript
// [CONFIRMED] 从 MCP handler (pos 1880934) 的调用模式提取
interface Tool {
  name: string;
  call(input, context, canUseTool, toolResultBuilder): Promise<string | object>;
  prompt(context): Promise<string>;
  inputSchema: ZodSchema;
  outputSchema?: ZodSchema;
  isReadOnly(input?): boolean;
  isDestructive?(input?): boolean;
  isOpenWorld?(input?): boolean;
  isEnabled(): boolean;
  validateInput?(input, context): Promise<ValidationResult>;
}
```

确认路径: MCP handler 调用链 `rP()` → `tJ()` → `RK(tools, name)` → `f.isEnabled()` → `f.validateInput()` → `f.call()`

### 7.2 14个内置工具 [CONFIRMED]

| 工具 | 权限分类 | 核心实现 |
|---|---|---|
| Bash | bashPrefixTools | C8(): execa封装，10min超时，1MB maxBuffer，永不reject |
| Read | filePatternTools | yo(): 符号链接解析 + 编码检测 + CRLF规范化 |
| Write | filePatternTools | uw_(): 原子写入(temp→rename)，权限保持 |
| Edit | filePatternTools | Read + 搜索替换 + Write |
| Glob | filePatternTools | glob 模式匹配 |
| Grep | — | 可能封装 ripgrep |
| Agent | 自定义 | subprocess 子agent，支持 worktree 隔离 |
| WebSearch | customValidation | 拒绝通配符 |
| WebFetch | customValidation | 强制 domain:hostname 格式 |
| NotebookEdit | filePatternTools | .ipynb 操作 |
| NotebookRead | filePatternTools | .ipynb 读取 |
| Tmux | — | 终端复用 |
| TaskStop | — | 停止后台任务 |
| TodoWrite | — | 会话任务列表 |

工具名变量: `mQ` 持有核心工具名数组；`MAH = [...mQ, "Tmux", wb]` 扩展数组 (`wb = "TaskStop"`)

### 7.3 工具执行管道 [CONFIRMED]

```
1. API Response with tool_use content block
   └─ Extract: tool name, input JSON, tool_use_id

2. Tool Resolution
   └─ RK(tools, name) — find tool object by name

3. Input Validation
   └─ tool.validateInput(input, context)
   └─ If invalid → return error tool_result

4. Permission Check (canUseTool / E callback)
   └─ Check allow/deny rules
   └─ Check permission mode (default/auto/bypassPermissions/etc.)
   └─ If auto mode → invoke tengu classifier (ONT)
   └─ If denied → record in permissionDenials, return deny result

5. PreToolUse Hook (if configured)
   └─ Execute matching hooks
   └─ Hook can block/modify execution

6. Tool Execution
   └─ tool.call(input, context, canUseTool, toolResultBuilder)

7. PostToolUse Hook (if configured)
   └─ PostToolUseFailure hooks on error

8. Result Construction
   └─ Build tool_result content block
   └─ Append to messages array

9. Next API Turn
   └─ Submit messages with tool_result back to Claude API
```

### 7.4 工具数组构造 [CONFIRMED, pos 1841027]

```javascript
// [CONFIRMED] 实际代码
let E_ = QB(N_.toolPermissionContext, N_.mcp.tools);
let b_ = Uw(Zy_([...K,...p,...Q.tools], E_, N_.toolPermissionContext.mode), "name");
```

构造流程：
```
Built-in (K/$) + MCP (p/k) + SDK (Q.tools)
    → QB() 构建权限上下文
    → Zy_() 按权限模式过滤
    → Uw() 按 name 去重（内置优先）
    → 最终 tools 数组
```

另一合并点 (pos 1833077):
```javascript
let k = go_(z.mcp.tools, z.toolPermissionContext);
let X = [...$, ...k];
```

### 7.5 canUseTool 权限函数 [CONFIRMED]

```javascript
// [CONFIRMED] np9 函数（导出为 getCanUseToolFn）
function np9(permissionPromptToolName, handler, getMcpTools, onRequiresAction) {
  if (permissionPromptToolName === "stdio")
    return handler.createCanUseTool(onRequiresAction);  // SDK stdio 模式
  if (!permissionPromptToolName)
    return TP;  // 默认内置权限检查器
  // 否则: 使用 MCP 权限提示工具
  return async (tool, input, context, history, toolUseId) => {
    // 查找 MCP 工具, 创建 ip9 包装器, 委托
  };
}
```

- **TP** — 默认权限检查器 (phantom, 在 M() 闭包内)
- **ip9** (`createCanUseToolWithPermissionPrompt`) — MCP 工具权限包装器：先调 TP，如果结果不确定则调 MCP 工具获取决策

### 7.6 并发工具执行 [CONFIRMED]

- 单次 API 响应中的多个 `tool_use` 块会被并行处理
- 所有 `tool_result` 收集后作为单个 user 消息返回
- 验证 (pos 586662): "ids of tool_result blocks and tool_use blocks from previous message do not match" — 严格 1:1 对应

---

## 8. 权限与安全系统

### 8.1 六种权限模式 [CONFIRMED, pos 857240]

| 模式 | 符号 | 颜色 | 行为 |
|---|---|---|---|
| default | (无) | text | 每次敏感操作前询问 |
| plan | ⏸ | planMode | 只读，不执行 |
| acceptEdits | ⏵⏵ | autoAccept | 自动接受编辑，bash 仍需确认 |
| bypassPermissions | ⏵⏵ | error | 跳过所有检查 |
| dontAsk | ⏵⏵ | error | 不询问，直接拒绝 |
| auto | ⏵⏵ | warning | Tengu AI 分类器决策 |

变量映射：
- `L4T` — 5 种外部模式数组
- `Q28` — 扩展数组 `[...L4T, "auto"]`
- `mM` — 所有模式 = `Q28`
- `auto` 模式对外映射为 `"default"`

### 8.2 权限规则结构 [CONFIRMED]

```javascript
permissions: {
  allow: [
    "Read(*)",           // 允许读取任意文件
    "Bash(npm run *)",   // 允许 npm run 开头的命令
    "Edit(src/**)",      // 允许编辑 src/ 下的文件
    "WebFetch(domain:github.com)"
  ],
  deny: [
    "Bash(rm -rf *)",
    "Edit(/.env)"
  ],
  defaultMode: "default",
  additionalDirectories: [...]
}
```

### 8.3 权限验证分类 [CONFIRMED, pos 862704]

```javascript
A6q = {
  filePatternTools: ["Read", "Write", "Edit", "Glob", "NotebookRead", "NotebookEdit"],
  bashPrefixTools: ["Bash"],
  customValidation: {
    WebSearch: (input) => { /* 拒绝通配符 */ },
    WebFetch: (input) => { /* 强制 domain: 格式 */ }
  }
};
```

- **filePatternTools**: 文件 glob 模式匹配 (`Edit(src/**)`)
- **bashPrefixTools**: 命令前缀匹配 (`Bash(npm:*)`, `Bash(git *)`)
- **customValidation**: 工具特定验证函数

### 8.4 Auto-Mode 分类器 (Tengu) [CONFIRMED, pos 1694777]

两阶段 AI 安全分类器 `ONT()`:

```
1. 提取分类器相关输入 (h27)
2. 构建输入摘要 (Z27)
3. 如果为空 → 直接允许
4. 构建对话转录 (b7$)
5. 估算 token 数 → 选择策略
6. Stage 1 (快速): API + 安全监控 prompt → 快速 yes/no
7. Stage 2 (完整): 如 Stage 1 不确定，深度分析
8. 返回: {shouldBlock, reason, model, usage, stage}
```

安全监控 prompt (模块 TNT, pos 1658699) 评估标准：
- 操作是否符合用户意图
- 是否可能造成破坏或数据泄露
- 是否违反 deny 列表
- 子代理安全检查（检查 Agent prompt 字段）

### 8.5 Sandbox 系统 [CONFIRMED]

| 平台 | 方式 |
|---|---|
| Linux | seccomp syscall 过滤 (注: 不能按路径过滤) |
| macOS | 平台特定 + Unix socket 控制 |
| | `enableWeakerNetworkIsolation` 允许 TLS 证书验证 |

**注意**: 代码中未发现 BubbleWrap/bwrap 引用。

配置 Schema (pos ~898340):
```javascript
sandbox: {
  enabled: boolean,
  failIfUnavailable: boolean,
  autoAllowBashIfSandboxed: boolean,
  allowUnsandboxedCommands: boolean,
  network: {
    allowedDomains: string[],
    allowManagedDomainsOnly: boolean,
    allowUnixSockets: string[],       // macOS only
    allowAllUnixSockets: boolean,
    allowLocalBinding: boolean,
    httpProxyPort: number,
    socksProxyPort: number
  },
  filesystem: {
    allowWrite: string[],
    denyWrite: string[],
    denyRead: string[],
    allowRead: string[],
    allowManagedReadPathsOnly: boolean
  },
  ignoreViolations: Record<string, string[]>,
  enableWeakerNestedSandbox: boolean,
  enableWeakerNetworkIsolation: boolean,
  excludedCommands: string[],
  ripgrep: { command: string, args?: string[] }
}
```

初始化 (pos 1830703): `Y8.initialize(H.createSandboxAskCallback())`

---

## 9. Hook 系统

### 9.1 24种 Hook 事件 [CONFIRMED, pos 866842]

| 事件 | 时机 | 说明 |
|---|---|---|
| PreToolUse | 工具执行前 | 可阻止/修改工具调用 |
| PostToolUse | 工具成功后 | 响应工具结果 |
| PostToolUseFailure | 工具失败后 | 处理工具错误 |
| Notification | 通知触发 | 系统通知 |
| UserPromptSubmit | 用户发送提示 | 输入预处理 |
| SessionStart | 会话开始 | 初始化 |
| SessionEnd | 会话结束 | 清理 |
| Stop | Agent 停止 | 关闭前处理 |
| StopFailure | 停止失败 | 错误处理 |
| SubagentStart | 子代理启动 | 子代理生命周期 |
| SubagentStop | 子代理完成 | 子代理生命周期 |
| PreCompact | 压缩前 | 上下文管理 |
| PostCompact | 压缩后 | 上下文管理 |
| PermissionRequest | 权限提示显示 | 权限 |
| Setup | 首次设置 | 初始化 |
| TeammateIdle | Teammate 空闲 | 多代理协调 |
| TaskCompleted | 后台任务完成 | 任务生命周期 |
| Elicitation | Agent 向用户提问 | 交互 |
| ElicitationResult | 用户回答问题 | 交互 |
| ConfigChange | 配置变更 | 设置 |
| WorktreeCreate | Git worktree 创建 | Worktree 生命周期 |
| WorktreeRemove | Git worktree 删除 | Worktree 生命周期 |
| InstructionsLoaded | 指令文件加载 | 设置 |
| CwdChanged | 工作目录变更 | 导航 |
| FileChanged | 文件磁盘修改 | 文件监控 |

可配置事件列表 (pos 935918):
`["PreToolUse", "PostToolUse", "Notification", "UserPromptSubmit", "SessionStart", "SessionEnd", "Stop", "SubagentStop", "PreCompact", "PostCompact", "TeammateIdle", "TaskCompleted"]`

### 9.2 四种 Hook 类型 [CONFIRMED, pos 867300 bA4()]

#### Command Hook
```typescript
{
  type: "command",
  command: string,          // Shell 命令
  shell: "bash"|"powershell",
  timeout: number,
  statusMessage: string,
  once: boolean,            // 执行一次后移除
  async: boolean,           // 后台非阻塞
  asyncRewake: boolean      // 后台 + exit code 2 时唤醒模型
}
```

#### Prompt Hook
```typescript
{
  type: "prompt",
  prompt: string,           // LLM prompt; $ARGUMENTS 替换为 hook 输入 JSON
  model: string,            // e.g., "claude-sonnet-4-6"
  timeout: number,
  statusMessage: string,
  once: boolean
}
```

#### HTTP Hook
```typescript
{
  type: "http",
  url: string,              // POST hook 输入 JSON 的 URL
  timeout: number,
  headers: Record<string, string>,  // 支持 $VAR_NAME 插值
  allowedEnvVars: string[],
  statusMessage: string,
  once: boolean
}
```

#### Agent Hook
```typescript
{
  type: "agent",
  prompt: string,           // 验证 prompt; $ARGUMENTS 替换为输入
  model: string,            // 默认: Haiku
  timeout: number,          // 默认: 60 秒
  statusMessage: string,
  once: boolean
}
```

### 9.3 Hook Matcher [CONFIRMED]

- 精确匹配: `"Bash"`
- 管道分隔: `"Edit|Write"`
- 全匹配: 空/省略

### 9.4 Hook 配置示例 [CONFIRMED]

```json
{
  "hooks": {
    "PreToolUse": [
      { "matcher": "Bash", "hooks": [{ "type": "command", "command": "echo $TOOL_INPUT" }] }
    ],
    "PostToolUse": [
      { "matcher": "Edit|Write", "hooks": [{ "type": "command", "command": "npm run lint" }] }
    ]
  }
}
```

### 9.5 Hook 生命周期事件 [CONFIRMED, pos 1831025]

在 headless 模式 (verbose + stream-json) 中，`Jq7` 函数注册监听器：

1. **hook_started**: `{hookId, hookName, hookEvent}`
2. **hook_progress**: `{hookId, hookName, hookEvent, stdout, stderr, output}`
3. **hook_response**: `{hookId, hookName, hookEvent, output, stdout, stderr, exit_code, outcome}`

### 9.6 Hook 子代理上下文 [CONFIRMED, pos 1756513]

`PreToolUse`, `PostToolUse`, `PostToolUseFailure` 包含 `agent_id` 和 `agent_type` 字段，允许 hook 识别触发工具的代理。

---

## 10. Sub-Agent 机制

### 10.1 Agent 工具概述 [CONFIRMED, pos 1651330]

工具名: `T9 = "Agent"` (pos 858407)

Prompt 描述:
> "Launch a new agent to handle complex, multi-step tasks autonomously. The Agent tool launches specialized agents (subprocesses) that autonomously handle complex tasks."

### 10.2 执行模式 [CONFIRMED]

- **前台** (默认): 等待子代理完成
- **后台** (`run_in_background: true`): 子代理并发运行，完成时自动通知父代理

来自 prompt 的指导:
> "When an agent runs in the background, you will be automatically notified when it completes — do NOT sleep, poll, or proactively check on its progress."

后台任务可通过 **TaskStop** 工具停止。

### 10.3 Worktree 隔离 [CONFIRMED]

`isolation: "worktree"` 在临时 git worktree 运行：
- 创建仓库的隔离副本
- 子代理在自己的分支操作
- 无变更自动清理
- 有变更返回 worktree 路径和分支
- 支持 `symlinkDirectories` 避免磁盘膨胀
- 触发 `WorktreeCreate` / `WorktreeRemove` Hook

Worktree 计数: `tJ8()` (pos 838844) 统计 `.git/worktrees/` 中的条目。

### 10.4 模型选择优先级 [CONFIRMED, pos 1655636 fh_()]

```
1. CLAUDE_CODE_SUBAGENT_MODEL env > (最高)
2. 显式 tool 输入参数 (opus/sonnet/haiku/inherit)
3. Agent 定义的模型配置
4. "inherit" 默认 → Ib() 根据 permissionMode 选择
```

支持的模型关键词: `opus`, `sonnet`, `haiku`, `inherit`
`q27()` 检查关键词是否匹配当前模型。

跨 Provider 处理: 如主模型在 Bedrock 而子代理模型不同，应用 `B46()` 翻译。

### 10.5 子代理通信 [CONFIRMED]

- 子代理全新启动，不继承对话上下文 (除非 `fork` 模式)
- Fork 模式: 继承完整对话上下文
- 结果作为单个消息返回给父代理
- **关键**: "The result returned by the agent is not visible to the user." — 父代理必须转发结果

### 10.6 安全约束 [CONFIRMED, pos 1666596]

Tengu 分类器对 Agent 工具的特殊处理:
> "carefully examine the `prompt` field. If the prompt instructs the sub-agent to perform ANY action from the BLOCK list, block the Agent call itself."

子代理操作继承安全约束。

### 10.7 Teammate 限制 [CONFIRMED, pos 1655331]

当作为 teammate 运行时 (`GR()` 检查):
- `run_in_background`, `name`, `team_name`, `mode` 参数不可用
- Teammate 不能生成其他 teammate
- 只支持同步子代理

---

## 11. 环境检测系统 [CONFIRMED]

```javascript
eq = {
  hasInternetAccess,
  isCI,
  platform,
  arch: "arm64",
  nodeVersion,
  terminal: DO4(),        // Cursor/Windsurf/VSCode/Ghostty/Kitty/tmux
  isSSH: OD8,
  getPackageManagers,     // npm/yarn/pnpm/bun
  getRuntimes,
  isRunningWithBun,
  isWslEnvironment,
  isConductor: PO4,
  detectDeploymentEnvironment: JO4  // Codespaces/Gitpod/Replit/Lambda/Docker/K8s
}
```

---

## 12. 完整环境变量列表

### 12.1 Provider 选择 [CONFIRMED]
| 环境变量 | 说明 |
|---|---|
| `CLAUDE_CODE_USE_BEDROCK` | 使用 AWS Bedrock |
| `CLAUDE_CODE_USE_VERTEX` | 使用 Google Vertex AI |
| `CLAUDE_CODE_USE_FOUNDRY` | 使用 ByteDance Foundry |

### 12.2 认证 [CONFIRMED]
| 环境变量 | 说明 |
|---|---|
| `ANTHROPIC_API_KEY` | API Key |
| `CLAUDE_CODE_CLIENT_CERT` | mTLS 客户端证书 |
| `CLAUDE_CODE_CLIENT_KEY` | mTLS 客户端密钥 |

### 12.3 Vertex 区域 [CONFIRMED]
| 环境变量 | 说明 |
|---|---|
| `VERTEX_REGION_CLAUDE_HAIKU_4_5` | Haiku 4.5 区域 |
| `VERTEX_REGION_CLAUDE_3_5_HAIKU` | 3.5 Haiku 区域 |
| `VERTEX_REGION_CLAUDE_3_5_SONNET` | 3.5 Sonnet 区域 |
| `VERTEX_REGION_CLAUDE_3_7_SONNET` | 3.7 Sonnet 区域 |
| `VERTEX_REGION_CLAUDE_4_1_OPUS` | 4.1 Opus 区域 |
| `VERTEX_REGION_CLAUDE_OPUS_4_6` | Opus 4.6 区域 |
| `VERTEX_REGION_CLAUDE_SONNET_4_6` | Sonnet 4.6 区域 |

### 12.4 模型覆盖 [CONFIRMED]
| 环境变量 | 说明 |
|---|---|
| `CLAUDE_CODE_SUBAGENT_MODEL` | 子代理模型覆盖 |
| `CLAUDE_CODE_MAX_MODEL` | 最大模型覆盖 |

### 12.5 运行时配置 [INFERRED]
| 环境变量 | 说明 |
|---|---|
| `CLAUDE_CODE_MAX_MCP_OUTPUT_TOKENS` | MCP 输出 token 上限 |
| `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC` | 禁用非必要网络流量 |
| `CLAUDE_CODE_APPROVED_PUSH_REMOTES` | 已批准的 push 远程 |

---

## 13. CLI/TUI 渲染架构 [CONFIRMED]

### 13.1 React + Ink 框架

使用 React + Ink 进行终端 UI 渲染：
- React 导入: `g3`, `CO.default`, `VV.default`, `bQT.default`
- 渲染函数: `yx()` (Ink 的 `render()`)
- 使用 `createElement()` 而非 JSX

### 13.2 核心组件映射

| 压缩名 | 原始组件 | 说明 |
|---|---|---|
| `m` | `Box` | 布局容器 |
| `G` | `Text` | 文本渲染 |
| `Ow` / `tw` | Provider | 包装组件 |
| `Hg9` | ServerSelector | MCP 服务器选择 |
| `vYO` | SetupComponent | 初始设置 |
| `IN_` | MultiSelect | 多选列表 |
| `NN_` | StatusIcon | 状态图标 |

### 13.3 React Compiler 优化 [CONFIRMED]

使用 `Symbol.for("react.memo_cache_sentinel")` 特征，表明经过 React Compiler 自动 memoization。

---

## 14. 外部依赖 [CONFIRMED]

| 分类 | 模块 |
|---|---|
| **核心** | path, os, fs, fs/promises, crypto, child_process |
| **网络** | http, https, http2, net, tls, url |
| **流** | stream, zlib, buffer |
| **异步** | async_hooks, events, timers/promises |
| **终端** | tty, readline |
| **工具** | util, assert, constants, perf_hooks |
| **第三方** | ws (WebSocket), undici (HTTP) |
| **Bun 原生** | `/$bunfs/root/image-processor.node` |
| | `/$bunfs/root/tree-sitter-bash.node` |
| | `/$bunfs/root/color-diff.node` |

---

## 15. 逆向局限性

### 15.1 M() 惰性闭包屏障

由于 M() 惰性闭包系统，以下内容在静态分析中完全不可见：

1. **cS 函数体** — 核心对话循环的完整实现
2. **各工具 .call() 实现** — 所有内置工具对象在 M() 闭包内构造
3. **TP 默认权限检查器** — 核心权限验证函数
4. **rP, tJ, RK 函数** — 工具注册、变换、查找
5. **Zy_, QB, Uw, go_ 函数** — 工具数组构造辅助
6. **完整 System Prompt 文本** — 在构建过程中动态组装

### 15.2 已成功映射的内容

尽管存在闭包屏障，分析成功识别了：
- 完整执行层次 (5 层)
- 工具数组构造管道 (3 源 → 过滤 → 去重)
- 全部 14 个内置工具名
- 核心工具函数 (文件读写, shell 执行) 的完整源码
- 完整权限系统 (6 种模式, 3 种验证分类, auto-mode 分类器)
- 完整 Hook 系统 (24 事件, 4 种 Hook 类型, 配置 Schema)
- Sub-agent 机制 (模型选择, worktree 隔离, 安全分类器)
- Sandbox 配置 (seccomp on Linux, 网络/文件系统隔离)
- 错误类层次
- 设置验证 Schema
- 关键区域模块边界映射

### 15.3 分析方法论

本分析完全通过对 minified bundle 的静态文本分析完成：
- 正则表达式模式匹配
- 位置分块提取
- 标识符交叉引用
- 调用点数据流重构
- Zod 验证定义 Schema 分析

未使用动态分析（执行、调试、反混淆）。

---

*分析完成于 claude_code_agent.js v2.1.83 (build 2026-03-25T05:15:24Z)*
