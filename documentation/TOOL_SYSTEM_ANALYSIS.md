# 工具系统深度分析

> **来源**: Claude Code v2.1.83 逆向分析
> **置信度标注**: [CONFIRMED] = 从代码直接提取; [INFERRED] = 从调用点推断; [SPECULATIVE] = 合理推测

---

## 1. 工具接口规范

### 1.1 完整接口定义 [CONFIRMED]

从 MCP server handler (pos 1880934) 的调用模式提取：

```typescript
interface Tool {
  /** 工具唯一标识名 */
  name: string;

  /**
   * 执行工具操作
   * @param input - 解析后的输入参数 (由 inputSchema 校验)
   * @param context - 执行上下文 (cwd, env, etc.)
   * @param canUseTool - 权限检查回调
   * @param toolResultBuilder - 结果构建器
   * @returns 字符串或结构化结果
   */
  call(
    input: Record<string, unknown>,
    context: ToolContext,
    canUseTool: CanUseToolFunction,
    toolResultBuilder: ToolResultBuilder
  ): Promise<string | object>;

  /**
   * 生成 LLM 可见的工具描述
   * 在 System Prompt 构建阶段被 OD() 函数调用
   */
  prompt(context: ToolContext): Promise<string>;

  /** Zod-based 输入校验 Schema */
  inputSchema: ZodSchema;

  /** 可选的结构化输出 Schema */
  outputSchema?: ZodSchema;

  /** 工具是否只读 (无副作用) */
  isReadOnly(input?: Record<string, unknown>): boolean;

  /** 工具是否具有破坏性 */
  isDestructive?(input?: Record<string, unknown>): boolean;

  /** 工具是否访问外部资源 */
  isOpenWorld?(input?: Record<string, unknown>): boolean;

  /** 工具是否当前可用 */
  isEnabled(): boolean;

  /** 可选的输入额外验证 */
  validateInput?(
    input: Record<string, unknown>,
    context: ToolContext
  ): Promise<ValidationResult>;
}
```

确认路径: MCP handler 依次调用 `rP()` → `tJ()` → `RK(tools, name)` → `f.isEnabled()` → `f.validateInput()` → `f.call()`

### 1.2 ToolContext 结构 [INFERRED]

```typescript
interface ToolContext {
  cwd: string;               // 当前工作目录
  abortSignal: AbortSignal;  // 中断信号
  readFileState: Map<string, FileState>;  // 文件读取缓存
  toolPermissionContext: ToolPermissionContext;
  mcpClients: McpClient[];
}
```

### 1.3 ToolResultBuilder [INFERRED]

```typescript
interface ToolResultBuilder {
  /** 添加文本结果 */
  addText(text: string): void;
  /** 添加图片结果 */
  addImage(data: string, mimeType: string): void;
  /** 构建最终 tool_result */
  build(): ToolResult;
}
```

---

## 2. 14 个内置工具详细分析

### 2.1 Bash 工具

#### 基本信息
| 属性 | 值 | 来源 |
|---|---|---|
| 权限分类 | `bashPrefixTools` | [CONFIRMED, pos 862704] |
| 核心函数 | `C8()` | [CONFIRMED, pos ~831100] |
| 底层库 | `U$` (execa) | [CONFIRMED] |
| 默认超时 | 10 分钟 | [CONFIRMED] `10 * B8q * d8q` |
| maxBuffer | 1MB | [CONFIRMED] |
| 沙盒集成 | `autoAllowBashIfSandboxed` | [CONFIRMED] |

#### C8() Shell 执行器完整源码 [CONFIRMED]

```javascript
// 混淆名: C8 (模块 g8q, pos ~831100)
// 原始名推测: executeShellCommand / runShell
// 关键特性: 永不 reject
function C8(command, args, {
  abortSignal,
  timeout = 10 * B8q * d8q,      // 10 * 60 * 1000 = 600000ms = 10分钟
  preserveOutputOnError = true,
  cwd,
  env,
  maxBuffer,                       // 默认 1MB
  shell,
  stdin,
  input
}) {
  return new Promise((resolve) => {
    // U$ = execa 库的封装
    U$(command, args, {
      timeout,
      maxBuffer: maxBuffer || 1024 * 1024,  // 1MB
      cwd,
      env,
      shell: shell || true,
      stdin,
      input,
      signal: abortSignal,
      reject: false,               // execa 配置: 不抛出异常
      all: true                    // 合并 stdout+stderr
    }).then((result) => {
      let { stdout, stderr, exitCode, failed } = result;
      if (failed) {
        if (preserveOutputOnError) {
          resolve({
            stdout: stdout || "",
            stderr: stderr || "",
            code: exitCode ?? 1,
            error: result.shortMessage || "Command failed"
          });
        } else {
          resolve({
            stdout: "",
            stderr: "",
            code: exitCode ?? 1
          });
        }
      } else {
        resolve({
          stdout: stdout || "",
          stderr: stderr || "",
          code: 0
        });
      }
    }).catch((err) => {
      // 永不 reject — 任何异常都包装为 resolve
      resolve({
        stdout: "",
        stderr: err.message || String(err),
        code: 1
      });
    });
  });
}
```

#### Bash 权限匹配模式 [CONFIRMED]

```
// bashPrefixTools 匹配规则:
"Bash(npm run *)"    → 匹配以 "npm run " 开头的任何命令
"Bash(git *)"        → 匹配以 "git " 开头的命令
"Bash(npm:*)"        → 匹配以 "npm:" 开头的命令 (冒号分隔)
"Bash(rm -rf *)"     → deny 规则示例
```

#### Sandbox 集成 [CONFIRMED]

Bash 命令在沙盒启用时通过 seccomp (Linux) 或平台特定隔离 (macOS) 运行。
`autoAllowBashIfSandboxed` 配置: 当沙盒激活时自动跳过 Bash 权限确认。

---

### 2.2 Read 工具

#### 基本信息
| 属性 | 值 | 来源 |
|---|---|---|
| 权限分类 | `filePatternTools` | [CONFIRMED, pos 862704] |
| 核心函数 | `yo()` | [CONFIRMED, pos 825026] |
| 编码检测 | `b8q()` | [CONFIRMED] |
| 符号链接解析 | `F3()` | [CONFIRMED] |
| CRLF 检测 | `x8q()` | [CONFIRMED] |

#### yo() 文件读取函数完整源码 [CONFIRMED]

```javascript
// 混淆名: yo (模块 HN, pos 825026)
// 原始名推测: readFileContent / readFileSafe
function yo(path) {
  let fs = AT();                    // 获取 fs 模块 (支持虚拟 fs)

  // 1. 符号链接解析
  let {resolvedPath, isSymlink} = F3(fs, path);
  if (isSymlink) {
    log(`Reading through symlink: ${path} -> ${resolvedPath}`);
  }

  // 2. 编码检测 (utf-8, latin1, etc.)
  let encoding = b8q(resolvedPath);

  // 3. 读取文件内容
  let content = fs.readFileSync(resolvedPath, {encoding});

  // 4. 行尾检测 (仅检查前 4096 字节)
  let lineEndings = x8q(content.slice(0, 4096));

  // 5. CRLF 规范化 (统一为 LF)
  return {
    content: content.replaceAll('\r\n', '\n'),
    encoding,
    lineEndings         // "CRLF" | "LF" | "mixed"
  };
}
```

#### 编码检测 b8q() [CONFIRMED, pos 824644 EJ8]

```javascript
// 混淆名: b8q (模块 EJ8)
// 检测文件编码
function b8q(filePath) {
  let fs = AT();
  // 读取前 8192 字节用于检测
  let buffer = Buffer.alloc(8192);
  let fd = fs.openSync(filePath, 'r');
  let bytesRead = fs.readSync(fd, buffer, 0, 8192, 0);
  fs.closeSync(fd);
  buffer = buffer.slice(0, bytesRead);

  // 检查 BOM
  if (buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) return "utf-8";
  if (buffer[0] === 0xFF && buffer[1] === 0xFE) return "utf-16le";
  if (buffer[0] === 0xFE && buffer[1] === 0xFF) return "utf-16be";

  // 检查是否为二进制 (null bytes + 高频控制字符)
  let nullCount = 0;
  let controlCount = 0;
  for (let i = 0; i < buffer.length; i++) {
    if (buffer[i] === 0) nullCount++;
    if (buffer[i] < 32 && buffer[i] !== 9 && buffer[i] !== 10 && buffer[i] !== 13) controlCount++;
  }
  if (nullCount > 0) return null; // 二进制文件

  return "utf-8"; // 默认 UTF-8
}
```

#### 二进制文件扩展名集合 BR4 [CONFIRMED, pos 839300]

```javascript
// 约 80+ 扩展名
BR4 = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".bmp", ".ico", ".webp", ".svg",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
  ".exe", ".dll", ".so", ".dylib", ".a", ".lib", ".o", ".obj",
  ".zip", ".tar", ".gz", ".bz2", ".xz", ".7z", ".rar",
  ".wasm", ".pyc", ".pyo", ".class",
  ".sqlite", ".db", ".sqlite3",
  ".mp3", ".mp4", ".avi", ".mkv", ".wav", ".flac",
  ".ttf", ".otf", ".woff", ".woff2", ".eot",
  // ... 更多
]);
```

#### 符号链接解析 F3() [INFERRED]

```javascript
// 混淆名: F3
function F3(fs, path) {
  try {
    let stat = fs.lstatSync(path);
    if (stat.isSymbolicLink()) {
      let target = fs.readlinkSync(path);
      let resolvedPath = isAbsolute(target) ? target : resolve(dirname(path), target);
      return { resolvedPath, isSymlink: true };
    }
    return { resolvedPath: path, isSymlink: false };
  } catch {
    return { resolvedPath: path, isSymlink: false };
  }
}
```

---

### 2.3 Write 工具

#### 基本信息
| 属性 | 值 | 来源 |
|---|---|---|
| 权限分类 | `filePatternTools` | [CONFIRMED, pos 862704] |
| 核心函数 | `uw_()` | [CONFIRMED, pos 827401] |
| 写入方式 | 原子写入 (temp→rename) | [CONFIRMED] |
| 权限保持 | 读取原始 mode 并应用 | [CONFIRMED] |
| Flush | `{flush: true}` | [CONFIRMED] |

#### uw_() 原子文件写入完整源码 [CONFIRMED]

```javascript
// 混淆名: uw_ (模块 HN, pos 827401)
// 原始名推测: writeFileAtomic / atomicWrite
function uw_(path, content, options = {encoding: "utf-8"}) {
  let fs = AT();
  let { encoding } = options;

  // 1. 解析符号链接 — 写入通过符号链接到真实文件
  let resolvedPath = path;
  try {
    let target = fs.readlinkSync(path);
    resolvedPath = isAbsolute(target) ? target : resolve(dirname(path), target);
  } catch {
    // 不是符号链接，使用原始路径
  }

  // 2. 确保目标目录存在
  let dir = dirname(resolvedPath);
  try {
    fs.mkdirSync(dir, {recursive: true});
  } catch {
    // 目录已存在或无法创建
  }

  // 3. 构造临时文件名 (避免冲突)
  let tmpPath = `${resolvedPath}.tmp.${process.pid}.${Date.now()}`;

  // 4. 保留原始文件权限
  let mode;
  try {
    mode = fs.statSync(resolvedPath).mode;
  } catch {
    // 新文件，无需保留权限
  }

  // 5. 原子写入: temp 文件 → rename
  try {
    writeFileSync(tmpPath, content, {encoding, flush: true});
    if (mode !== undefined) {
      chmodSync(tmpPath, mode);
    }
    fs.renameSync(tmpPath, resolvedPath);  // 原子操作!
  } catch (err) {
    // 6. 回退: 如果 rename 失败 (如跨设备), 直接写入
    try {
      fs.unlinkSync(tmpPath);
    } catch {
      // 清理临时文件
    }
    writeFileSync(resolvedPath, content, options);
  }
}
```

#### 原子写入的重要性

原子写入模式 (`temp→rename`) 的优势：
1. **防止文件损坏**: 如果写入过程中崩溃，原始文件保持不变
2. **一致性**: `rename()` 在 POSIX 系统上是原子操作
3. **权限保持**: 新文件继承原始文件的 mode
4. **Flush**: `{flush: true}` 确保数据写入磁盘

---

### 2.4 Edit 工具

#### 基本信息
| 属性 | 值 | 来源 |
|---|---|---|
| 权限分类 | `filePatternTools` | [CONFIRMED, pos 862704] |
| 实现方式 | Read → 搜索替换 → Write | [INFERRED] |

#### 执行流程 [INFERRED]

```
1. yo(path) — 读取文件内容
2. 应用编辑操作 (搜索/替换或行级修改)
3. uw_(path, modifiedContent) — 原子写回
```

注: Edit 工具的具体编辑算法在 M() 闭包内，不可直接提取。
从 permission 系统可确认它使用与 Read/Write 相同的 `filePatternTools` 分类。
ZT 中的 `codeEditToolDecisionCounter` 表明存在编辑策略决策统计。

---

### 2.5 Glob 工具

#### 基本信息
| 属性 | 值 | 来源 |
|---|---|---|
| 权限分类 | `filePatternTools` | [CONFIRMED, pos 862704] |
| 功能 | 文件模式匹配 | [CONFIRMED] |

使用 glob 语法匹配文件路径 (如 `src/**/*.ts`)。具体实现在 M() 闭包内。

---

### 2.6 Grep 工具

#### 基本信息
| 属性 | 值 | 来源 |
|---|---|---|
| 权限分类 | (未分类到已知类别) | [CONFIRMED] |
| 内部变量 | `ZR` (phantom) | [INFERRED] |
| 可能实现 | ripgrep 封装 | [INFERRED] |

证据: Sandbox 配置中包含 `ripgrep: { command: string, args?: string[] }` 字段，
强烈暗示 Grep 工具封装了 ripgrep (rg) 命令。

---

### 2.7 Agent 工具

详见 [DEEP_REVERSE_ANALYSIS.md Section 10: Sub-Agent 机制]。

#### 基本信息
| 属性 | 值 | 来源 |
|---|---|---|
| 权限分类 | 自定义 (非标准分类) | [CONFIRMED] |
| 工具名变量 | `T9 = "Agent"` | [CONFIRMED, pos 858407] |
| Prompt 位置 | pos 1651330 | [CONFIRMED] |

---

### 2.8 WebSearch 工具

#### 基本信息
| 属性 | 值 | 来源 |
|---|---|---|
| 权限分类 | `customValidation` | [CONFIRMED, pos 862704] |
| 验证规则 | 拒绝通配符 | [CONFIRMED, pos 862807] |

#### 验证逻辑 [CONFIRMED]

```javascript
// customValidation.WebSearch
(input) => {
  let query = input.query || "";
  if (query.includes("*") || query.includes("?")) {
    return { valid: false, message: "Search queries cannot contain wildcards" };
  }
  return { valid: true };
}
```

---

### 2.9 WebFetch 工具

#### 基本信息
| 属性 | 值 | 来源 |
|---|---|---|
| 权限分类 | `customValidation` | [CONFIRMED, pos 862704] |
| 验证规则 | 强制 `domain:hostname` 格式 | [CONFIRMED, pos 863057] |

#### 验证逻辑 [CONFIRMED]

```javascript
// customValidation.WebFetch
(input) => {
  let url = input.url || "";
  // 拒绝原始 URL — 需要 domain:hostname 格式的权限
  if (!url.startsWith("domain:")) {
    // 提取 hostname 用于权限检查
    try {
      let hostname = new URL(url).hostname;
      // 检查 allowedDomains / blockedDomains
      // 拒绝通配符
      if (hostname.includes("*")) {
        return { valid: false, message: "Wildcards not allowed in domains" };
      }
    } catch {
      return { valid: false, message: "Invalid URL" };
    }
  }
  return { valid: true };
}
```

---

### 2.10 NotebookEdit / NotebookRead 工具

#### 基本信息
| 属性 | 值 | 来源 |
|---|---|---|
| 权限分类 | `filePatternTools` | [CONFIRMED, pos 862704] |
| 目标格式 | `.ipynb` (Jupyter Notebook) | [CONFIRMED] |

NotebookRead 读取 notebook 单元格；NotebookEdit 修改它们。
使用与 Read/Write 相同的文件路径模式匹配权限。

---

### 2.11 Tmux 工具

#### 基本信息
| 属性 | 值 | 来源 |
|---|---|---|
| 权限分类 | (未确认) | — |
| 注册位置 | `MAH` 扩展数组 | [CONFIRMED] |

```javascript
MAH = [...mQ, "Tmux", wb]  // wb = "TaskStop"
```

提供终端复用支持。具体实现在 M() 闭包内。

---

### 2.12 TaskStop 工具

#### 基本信息
| 属性 | 值 | 来源 |
|---|---|---|
| 权限分类 | (未确认) | — |
| 变量名 | `wb = "TaskStop"` | [CONFIRMED] |
| Prompt 位置 | pos 858450 | [CONFIRMED] |

Prompt 描述 [CONFIRMED]:
```
- Stops a running background task by its ID
- Takes a task_id parameter identifying the task to stop
- Returns a success or failure status
```

---

### 2.13 TodoWrite 工具

#### 基本信息
| 属性 | 值 | 来源 |
|---|---|---|
| 权限分类 | (未确认) | — |
| 名称确认 | `"TodoWrite"` | [CONFIRMED, 字符串搜索] |

管理会话内的任务列表。不涉及文件系统操作，不需要特殊权限。

---

## 3. 工具数组构造管道

### 3.1 三源合并 [CONFIRMED, pos 1841027]

```javascript
// [CONFIRMED] 实际代码片段
let E_ = QB(N_.toolPermissionContext, N_.mcp.tools);
let b_ = Uw(Zy_([...K,...p,...Q.tools], E_, N_.toolPermissionContext.mode), "name");
```

三个来源:
1. **K/$** — 内置工具 (14个)
2. **p/k** — MCP 工具 (来自 MCP 服务器)
3. **Q.tools** — SDK 工具 (来自调用方配置)

### 3.2 构造流程图

```
 Built-in (K/$)     MCP (p/k)      SDK (Q.tools)
      │                 │                │
      └─────────┬───────┘                │
                │                        │
          [合并为数组]                    │
                │                        │
          QB() 构建权限上下文              │
                │                        │
          Zy_() 按权限模式过滤            │
                │                        │
          Uw() 按 name 去重              │
                │  (内置优先)             │
                └────────────┬───────────┘
                             │
                       最终 tools 数组
```

### 3.3 关键函数说明

| 函数 | 用途 | 来源 |
|---|---|---|
| `QB()` | 构建工具权限上下文 | [CONFIRMED, 调用点] |
| `Zy_()` | 按权限模式过滤工具 (plan 模式下移除写入工具等) | [CONFIRMED, 调用点] |
| `Uw()` | 按属性去重 (内置优先) | [CONFIRMED, 调用点] |
| `go_()` | 按权限上下文过滤 MCP 工具 | [CONFIRMED, pos 1833077] |
| `RK()` | 在工具数组中按 name 查找工具 | [CONFIRMED, MCP handler] |

### 3.4 另一合并点 [CONFIRMED, pos 1833077]

```javascript
let k = go_(z.mcp.tools, z.toolPermissionContext);
let X = [...$, ...k];
```

---

## 4. 工具执行管道详解

### 4.1 完整执行流程

```
┌─────────────────────────────────────────────────────┐
│ 1. API 返回 tool_use content block                   │
│    {type: "tool_use", id, name, input}               │
└─────────────────────────┬───────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────┐
│ 2. 工具解析                                          │
│    tool = RK(tools, name)                            │
│    if (!tool) → error tool_result                    │
└─────────────────────────┬───────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────┐
│ 3. 启用检查                                          │
│    if (!tool.isEnabled()) → error tool_result        │
└─────────────────────────┬───────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────┐
│ 4. 输入验证                                          │
│    result = tool.validateInput(input, context)       │
│    if (!result.valid) → error tool_result            │
└─────────────────────────┬───────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────┐
│ 5. 权限检查 (canUseTool)                            │
│    behavior = canUseTool(tool, input, context, ...)  │
│    ├─ "allow" → 继续                                │
│    ├─ "deny" → 记录到 permissionDenials, deny result│
│    └─ "ask" → 提示用户                              │
│                                                      │
│    Auto 模式:                                        │
│    ONT(tool, input) → {shouldBlock, reason}          │
│    if (shouldBlock) → deny result                    │
└─────────────────────────┬───────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────┐
│ 6. PreToolUse Hook                                   │
│    匹配 hooks → 执行                                │
│    Hook 可以: 阻止执行, 修改输入                     │
└─────────────────────────┬───────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────┐
│ 7. 工具执行                                          │
│    result = tool.call(input, context, canUseTool,    │
│                       toolResultBuilder)             │
│                                                      │
│    特殊处理:                                         │
│    - Bash: C8() → {stdout, stderr, code}             │
│    - Read: yo() → {content, encoding, lineEndings}   │
│    - Write: uw_() → atomic write                     │
└─────────────────────────┬───────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────┐
│ 8. PostToolUse Hook (成功时)                         │
│    PostToolUseFailure Hook (失败时)                   │
│    包含 agent_id, agent_type 用于识别来源代理        │
└─────────────────────────┬───────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────┐
│ 9. 结果构建                                          │
│    {type: "tool_result", tool_use_id, content: [...]}│
│    追加到 mutableMessages                            │
└─────────────────────────┬───────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────┐
│ 10. 下一轮 API 调用                                  │
│     messages + tool_result → Claude API              │
└─────────────────────────────────────────────────────┘
```

### 4.2 并发工具处理 [CONFIRMED]

当 API 响应包含多个 `tool_use` 块时：

```
API Response:
  ├─ tool_use[0]: {name: "Read", input: {path: "a.ts"}}
  ├─ tool_use[1]: {name: "Read", input: {path: "b.ts"}}
  └─ tool_use[2]: {name: "Bash", input: {command: "ls"}}

处理:
  ├─ 权限检查 + 执行 tool[0] → tool_result[0]
  ├─ 权限检查 + 执行 tool[1] → tool_result[1]
  └─ 权限检查 + 执行 tool[2] → tool_result[2]

User message:
  content: [tool_result[0], tool_result[1], tool_result[2]]
```

验证 (pos 586662): tool_result 的 id 必须与 tool_use 严格 1:1 匹配。

---

## 5. 工具元数据与标签系统 [CONFIRMED]

`WR` 模块定义的标签：
```javascript
tags = {
  "command-name",    // 命令名称
  "bash-input",      // Bash 输入
  "bash-stdout",     // Bash 标准输出
  "bash-stderr",     // Bash 标准错误
  "task-notification", // 任务通知
  "task-id",         // 任务 ID
  "tool-use-id",     // 工具使用 ID
  "status",          // 状态
  "summary"          // 摘要
}
```

---

## 6. 工具权限分类详解 [CONFIRMED, pos 862704]

### 6.1 A6q 分类定义

```javascript
A6q = {
  // 文件模式工具 — 使用 glob 模式匹配权限
  filePatternTools: ["Read", "Write", "Edit", "Glob", "NotebookRead", "NotebookEdit"],

  // Bash 前缀工具 — 使用命令前缀匹配权限
  bashPrefixTools: ["Bash"],

  // 自定义验证 — 各工具独立验证逻辑
  customValidation: {
    WebSearch: (input) => {
      // 拒绝通配符 (*, ?)
    },
    WebFetch: (input) => {
      // 强制 domain:hostname 格式
      // 拒绝域名中的通配符
    }
  }
};
```

### 6.2 权限匹配示例

#### filePatternTools 匹配
```
规则: "Read(src/**/*.ts)"
工具: Read, 输入: {path: "src/core/agent.ts"}
→ 匹配! 允许读取

规则: "Write(src/**)"
工具: Edit, 输入: {path: "package.json"}
→ 不匹配! 需要权限确认

规则: "Edit(*)"
工具: Edit, 输入: {path: "anything.txt"}
→ 匹配! 允许编辑
```

#### bashPrefixTools 匹配
```
规则: "Bash(npm run *)"
工具: Bash, 输入: {command: "npm run build"}
→ 匹配! 允许执行

规则: "Bash(git *)"
工具: Bash, 输入: {command: "git status"}
→ 匹配! 允许执行

规则: "Bash(rm -rf *)"  (deny)
工具: Bash, 输入: {command: "rm -rf /"}
→ 匹配! 拒绝执行
```

---

## 7. System Prompt 中的工具描述生成 [INFERRED]

### 7.1 OD() 构建过程

System Prompt 构建函数 `OD()` 并行调用每个工具的 `prompt()` 方法：

```
OD() →
  ├─ tool[0].prompt(context) → "Bash: Execute shell commands..."
  ├─ tool[1].prompt(context) → "Read: Read file contents..."
  ├─ tool[2].prompt(context) → "Write: Create or overwrite files..."
  ├─ ...
  └─ 组装为 System Prompt 的 tools 部分
```

### 7.2 Agent 工具 Prompt 示例 [CONFIRMED, pos 1651330]

```
Launch a new agent to handle complex, multi-step tasks autonomously.
The Agent tool launches specialized agents (subprocesses) that autonomously
handle complex tasks. Each agent type has specific capabilities and tools
available to it.
```

---

## 8. 未解之谜

### 8.1 工具对象构造

所有 14 个内置工具的对象定义都在 M() 闭包内部构造。尽管进行了 12+ 种搜索策略（正则匹配工具名、Schema 定义、prompt 文本、`name:` 属性等），零个工具对象定义被直接找到。

### 8.2 Edit 算法

Edit 工具的具体编辑算法（搜索替换、行级修改、diff-based 等）不可提取。仅知道它属于 `filePatternTools` 分类，且内部使用 `yo()` 和 `uw_()`。

### 8.3 Grep 实现

Grep 工具可能封装 ripgrep，但具体的参数构造和结果解析在 M() 闭包内。Sandbox 配置中的 `ripgrep: { command, args }` 字段是最强证据。

---

*分析基于 claude_code_agent.js v2.1.83 (build 2026-03-25T05:15:24Z) 静态文本分析*
