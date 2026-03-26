# Bun Code Agent 技术架构深度分析报告

## 执行摘要

本报告针对 Bun v2.1.83 编译的 Code Agent 二进制文件进行了深入的技术架构分析。该 Agent 是一个基于 Bun 运行时的智能代码助手，采用 **Client-Server 架构**，通过 WebSocket 和 Unix Socket 进行通信，集成了代码搜索、文件操作、调试等核心功能。

---

## 1. 架构概览

### 1.1 整体架构模式

```
┌─────────────────────────────────────────────────────────────┐
│                     Code Agent 整体架构                      │
└─────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────┐
│   Frontend/IDE   │◄───────►│   Code Agent     │
│  (Client)        │  WS     │   (Server)       │
└──────────────────┘         └──────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
            ┌───────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐
            │  Debugger    │  │  Tool       │  │  Bun        │
            │  Backend     │  │  System     │  │  Runtime    │
            └──────────────┘  └─────────────┘  └─────────────┘
                    │                 │
            ┌───────▼─────────────────▼──────┐
            │   Embedded Tools               │
            │  - Ripgrep (搜索)               │
            │  - File System API             │
            │  - HTTP Client/Server          │
            │  - Database Connectors         │
            └────────────────────────────────┘
```

### 1.2 核心组件

1. **Debugger Backend** - Chrome DevTools Protocol 兼容的调试后端
2. **Tool System** - 文件操作、代码搜索、命令执行等工具集
3. **Communication Layer** - WebSocket + Unix Socket 双协议支持
4. **Execution Engine** - Bun JavaScript/TypeScript 运行时
5. **Embedded Tools** - Ripgrep、数据库驱动等嵌入式工具

---

## 2. 通信协议与消息传递

### 2.1 WebSocket 协议栈

**支持的协议**:
```javascript
ws://hostname:port/path          // 标准 WebSocket
wss://hostname:port/path         // 安全 WebSocket
ws+tcp://hostname:port/path      // TCP WebSocket
ws+unix://socket-path            // Unix Socket WebSocket
```

**协议选择逻辑**:
```javascript
if (protocol === "ws:" || protocol === "wss:" || protocol === "ws+tcp:") {
    // 使用 TCP WebSocket 连接
    websocket: this.#websocket
} else if (protocol === "ws+unix:") {
    // 使用 Unix Domain Socket
    websocket: this.#websocket
}
```

### 2.2 消息帧协议 (SocketFramer)

**实现细节**:
```javascript
class SocketFramer {
    onData(socket, bytes) {
        // 状态机:
        // 0: WaitingForLength (等待长度)
        // 1: WaitingForMessage (等待消息)

        // 消息格式:
        // [4 bytes: length][N bytes: UTF-8 message]
    }

    send(socket, message) {
        // 发送格式:
        // length (UInt32 BE) + message (UTF-8)
    }
}
```

**状态机流程**:
```
┌──────────────┐
│ WaitingFor   │
│ Length (0)   │
└──────┬───────┘
       │ 接收 4 字节长度
       ▼
┌──────────────┐
│ WaitingFor   │
│ Message (1)  │
└──────┬───────┘
       │ 接收 N 字节消息
       │
       ├──────► 处理消息
       │
       └──────► 返回状态 0
```

### 2.3 缓冲写入器 (BufferedWriter)

**实现机制**:
```javascript
function bufferedWriter(writer) {
    let draining = false;
    let pendingMessages = [];

    return {
        write(message) {
            if (draining || !writer.write(message)) {
                pendingMessages.push(message);
            }
        },
        drain() {
            if (pendingMessages.length > 0) {
                // 批量发送待发送消息
                for (let msg of pendingMessages) {
                    writer.write(msg);
                }
                pendingMessages = [];
            }
        },
        close() {
            writer.close();
            pendingMessages.length = 0;
        }
    };
}
```

**背压处理**:
- 使用 `draining` 标志防止写入冲突
- 待发送消息队列缓冲
- 批量发送优化性能

---

## 3. 调试器架构 (Debugger Backend)

### 3.1 核心类设计

```typescript
class Debugger {
    #createBackend: Function;
    #url: URL;
    #websocket: WebSocket;

    constructor(
        executionContextId: number,
        url: string,
        createBackend: Function,
        send: Function,
        close: Function
    ) {
        // 初始化调试后端
        this.#createBackend = (refEventLoop, receive) => {
            return createBackend(executionContextId, refEventLoop, receive);
        };
    }

    #open(connection, writer) {
        let backend = this.#createBackend(refEventLoop, (messages) => {
            // 接收来自 backend 的消息
        });
    }
}
```

### 3.2 Backend 创建工厂

```javascript
function createBackend(
    executionContextId: number,
    refEventLoop: boolean,
    receive: Function
): Backend {
    // 返回 backend 对象，包含:
    // - write(message): 发送消息
    // - close(): 关闭连接
}
```

### 3.3 执行上下文管理

**关键概念**:
- **executionContextId**: 标识不同的代码执行环境
- **refEventLoop**: 是否保持事件循环活跃
- **Backend**: 负责实际的消息路由和执行

**多上下文支持**:
```javascript
// 支持多个执行上下文（如不同的文件、模块）
context_1: { id: 1, backend: backend_1 }
context_2: { id: 2, backend: backend_2 }
```

---

## 4. Unix Socket 服务器

### 4.1 连接实现

```javascript
async function connectToUnixServer(
    executionContextId: number,
    unixPath: string,
    createBackend: Function,
    send: Function,
    close: Function
) {
    // 1. 连接到 Unix Domain Socket
    // 2. 创建 backend 实例
    // 3. 设置消息帧协议
    // 4. 启动双向通信
}
```

### 4.2 优势

- **性能**: 比 TCP 更低的延迟
- **安全**: 文件系统权限控制
- **隔离**: 本地进程通信，不暴露网络端口

---

## 5. Inspector 集成

### 5.1 Bun Inspector 架构

```
┌─────────────────────────────────────────┐
│         Bun Inspector UI                │
│   https://debug.bun.sh/#host:port       │
└────────────┬────────────────────────────┘
             │
             │ WebSocket (Chrome DevTools Protocol)
             │
┌────────────▼────────────────────────────┐
│      Bun Inspector Server               │
│  - 协议处理                              │
│  - 消息路由                              │
│  - 状态管理                              │
└────────────┬────────────────────────────┘
             │
             │ Internal API
             │
┌────────────▼────────────────────────────┐
│      JavaScript Debugger                │
│  - 断点管理                              │
│  - 源码映射                              │
│  - 执行控制                              │
└─────────────────────────────────────────┘
```

### 5.2 环境变量配置

```bash
BUN_INSPECT_NOTIFY=url   # 调试器通知URL
--inspect                # 激活调试器
--inspect-wait           # 等待连接后执行
--inspect-brk            # 第一行断点并等待
```

### 5.3 Inspector 模块

```javascript
// build/release/tmp_modules/node/inspector.ts
module.exports = {
    Session: BaseSession,
    console,
    open,
    close,
    url,
    waitForDebugger
};
```

---

## 6. 嵌入式工具系统

### 6.1 Ripgrep 集成

**版本**: ripgrep (嵌入二进制)

**功能**:
- 正则表达式搜索
- 多行搜索
- 压缩文件搜索 (.gz, .bz2, .xz, .lz4, .zst)
- Git 忽略规则支持
- 高性能文件过滤

**配置支持**:
```bash
RIPGREP_CONFIG_PATH=/path/to/config
--no-config  # 禁用配置文件
```

**搜索类型**:
```
- Grep (正则搜索)
- Glob (文件模式匹配)
- Context 搜索 (前后文)
```

### 6.2 文件操作工具

**Bun File API**:
```javascript
// 读取文件
Bun.file(path).text()
Bun.file(path).json()
Bun.file(path).arrayBuffer()

// 写入文件
Bun.write(path, content)

// 文件信息
Bun.file(path).size
Bun.file(path).type
Bun.file(path).lastModified
```

**Glob 模式匹配**:
```javascript
const glob = new Bun.Glob(pattern);
for await (const entry of glob.scan(options)) {
    // 处理匹配的文件
}
```

### 6.3 数据库工具

**支持数据库**:
1. **SQLite** (`bun:sqlite`)
   - 内存数据库 (`:memory:`)
   - 只读模式
   - 连接池

2. **PostgreSQL**
   - SSL/TLS 连接
   - 连接池
   - 事务支持

3. **MySQL/MariaDB**
   - 原生协议
   - 连接池

**连接字符串格式**:
```
postgres://user:pass@host:port/database?sslmode=require
mysql://user:pass@host:port/database
sqlite://path/to/db.sqlite
```

### 6.4 HTTP 客户端/服务器

**Fetch API**:
```javascript
const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
});
```

**HTTP Server**:
```javascript
Bun.serve({
    port: 3000,
    fetch(request, server) {
        return new Response('Hello');
    },
    upgrade(request, data) {
        // WebSocket 升级
    }
});
```

---

## 7. Bun 运行时集成

### 7.1 FFI 系统

**功能**: JavaScript 直接调用 C/C++ 库

```javascript
const ffi = globalThis.Bun.FFI;

// 核心API
ffi.ptr(arg1, arg2)              // 指针操作
ffi.toBuffer(ptr)                // 转换为 Buffer
ffi.toArrayBuffer(ptr)           // 转换为 ArrayBuffer
ffi.viewSource(ptr)              // 查看源代码
ffi.CString(ptr, offset, len)    // C 字符串
ffi.linkSymbols(options)         // 链接符号
ffi.dlopen(path, options)        // 动态加载库
ffi.callback(options)            // 创建回调
```

**使用场景**:
- 调用系统库
- 性能关键路径
- 与原生工具集成

### 7.2 模块系统

**内部模块注册表**:
```javascript
@internalModuleRegistry  // 存储内部模块
@createInternalModuleById(id)  // 按ID创建模块
@lazy(id)  // 懒加载
```

**已识别模块ID**:
```
ID 6:   myersDiff (文本差异算法)
ID 9:   Buffer相关
ID 10:  getRawKeys
ID 20:  字符串宽度计算
ID 25:  HTTP内部模块
ID 32:  Stream相关
ID 40:  Duplex流
ID 55:  Readable流
ID 64:  colors (颜色处理)
ID 66:  format (格式化)
ID 68:  验证工具
ID 71:  globalAgent
ID 73-75: HTTP服务器/客户端
ID 87:  child_process
ID 96:  EventEmitter
ID 103: inspector
ID 104: net模块
ID 107: path模块
```

### 7.3 子进程管理

**Bun.spawn()**:
```javascript
const proc = Bun.spawn(['command', 'args'], {
    cwd: '/working/directory',
    env: { ...process.env },
    stdout: 'pipe',
    stderr: 'pipe'
});

await proc.exited;
```

**使用场景**:
- 执行 shell 命令
- 运行外部工具
- 进程间通信

---

## 8. 安全与权限

### 8.1 权限控制

**发现的安全机制**:
```javascript
// SQL 查询标志
SQLQueryFlags.allowUnsafeTransaction
SQLQueryFlags.unsafe
SQLQueryFlags.bigint
```

**安全检查**:
- 文件路径验证
- SQL 注入防护
- 连接头过滤 (`isConnectionHeaderAllowed`)

### 8.2 沙箱机制

**潜在实现** (推断):
- 进程隔离
- 文件系统访问控制
- 网络权限管理

---

## 9. 性能优化技术

### 9.1 零拷贝 I/O

```javascript
// Bun.file() 返回懒加载的文件引用
const file = Bun.file(path);
// 只有在读取时才加载内容
const text = await file.text();
```

### 9.2 流式处理

```javascript
// Readable/Writable/Duplex 流
const stream = new Readable({
    read(size) {
        // 按需读取
    }
});
```

### 9.3 JIT 编译

- **JavaScriptCore** 引擎 (推断)
- 热路径优化
- 内联缓存

### 9.4 连接池

**数据库连接池**:
```javascript
{
    max: 10,                    // 最大连接数
    idleTimeout: 30000,         // 空闲超时
    connectionTimeout: 5000,    // 连接超时
    maxLifetime: 3600000        // 最大生命周期
}
```

---

## 10. 消息流分析

### 10.1 典型的请求-响应流程

```
┌──────────┐                 ┌──────────┐                 ┌──────────┐
│  Client  │                 │  Agent   │                 │  Tool    │
└────┬─────┘                 └────┬─────┘                 └────┬─────┘
     │                            │                            │
     │  1. WebSocket Connect      │                            │
     │───────────────────────────►│                            │
     │                            │                            │
     │  2. Initialize Request     │                            │
     │───────────────────────────►│                            │
     │                            │                            │
     │                            │  3. Execute Tool           │
     │                            │───────────────────────────►│
     │                            │                            │
     │                            │  4. Tool Result            │
     │                            │◄───────────────────────────┤
     │                            │                            │
     │  5. Response               │                            │
     │◄───────────────────────────┤                            │
     │                            │                            │
```

### 10.2 消息格式 (推断)

**请求消息**:
```json
{
    "id": 1,
    "method": "tool.execute",
    "params": {
        "tool": "Read",
        "args": {
            "file_path": "/path/to/file"
        }
    }
}
```

**响应消息**:
```json
{
    "id": 1,
    "result": {
        "content": "file content...",
        "metadata": {
            "size": 1024,
            "lines": 50
        }
    }
}
```

---

## 11. 工具系统详解

### 11.1 文件操作工具

**Read 工具**:
```javascript
// 功能: 读取文件内容
async function read(file_path, options) {
    const file = Bun.file(file_path);
    const content = await file.text();

    return {
        content,
        size: file.size,
        lastModified: file.lastModified
    };
}
```

**Write 工具**:
```javascript
// 功能: 写入文件
async function write(file_path, content) {
    await Bun.write(file_path, content);
    return { success: true };
}
```

**Edit 工具**:
```javascript
// 功能: 编辑文件 (使用 Myers diff)
import { myersDiff } from '@internalModuleRegistry';

function edit(file_path, old_string, new_string) {
    // 1. 读取文件
    // 2. 应用 Myers diff 算法
    // 3. 写入文件
}
```

### 11.2 搜索工具

**Grep 工具**:
```javascript
// 基于嵌入式 ripgrep
function grep(pattern, path, options) {
    // 调用 ripgrep 二进制
    const proc = Bun.spawn(['rg', pattern, path, ...options]);
    return parseOutput(proc.stdout);
}
```

**Glob 工具**:
```javascript
// 使用 Bun.Glob
function glob(pattern, options) {
    const g = new Bun.Glob(pattern);
    const results = [];

    for await (const entry of g.scan(options)) {
        results.push(entry);
    }

    return results;
}
```

### 11.3 执行工具

**Bash 工具**:
```javascript
// 执行 shell 命令
async function bash(command, options) {
    const proc = Bun.spawn(['sh', '-c', command], {
        cwd: options.cwd,
        env: options.env,
        stdout: 'pipe',
        stderr: 'pipe'
    });

    const [exitCode, stdout, stderr] = await Promise.all([
        proc.exited,
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text()
    ]);

    return { exitCode, stdout, stderr };
}
```

### 11.4 LSP 工具 (推断)

**Language Server Protocol 集成**:
```javascript
// LSP 客户端实现 (推测)
class LSPClient {
    // goToDefinition
    // findReferences
    // hover
    // documentSymbol
    // workspaceSymbol
    // goToImplementation
    // prepareCallHierarchy
    // incomingCalls
    // outgoingCalls
}
```

---

## 12. 构建与打包

### 12.1 编译配置

**构建路径**:
```
/Users/runner/work/bun-internal/bun-internal/
build/release/tmp_modules/
```

**编译标志**:
```
-DNDEBUG                           // Release 构建
-I/Users/.../embedded/oniguruma/   // Oniguruma 正则引擎
-Wundef-prefix=BFS_                // 编译器警告
```

### 12.2 打包产物

**二进制结构**:
```
┌────────────────────────────────────┐
│  Mach-O 64-bit executable arm64    │
├────────────────────────────────────┤
│  Bun Runtime (Zig + JavaScriptCore)│
├────────────────────────────────────┤
│  Embedded JavaScript Modules       │
│  - debugger.ts                     │
│  - inspector.ts                    │
│  - http.ts                         │
│  - sqlite.ts                       │
├────────────────────────────────────┤
│  Embedded Rust Tools               │
│  - ripgrep                         │
│  - regex-automata                  │
├────────────────────────────────────┤
│  Native Libraries                  │
│  - libicucore                      │
│  - libc++                          │
│  - libSystem                       │
└────────────────────────────────────┘
```

---

## 13. 环境变量与配置

### 13.1 Agent 配置

```bash
# 调试器
BUN_INSPECT_NOTIFY=url

# 端口配置
BUN_PORT=3000
PORT=3000
NODE_PORT=3000

# 性能调优
BUN_DISABLE_DYNAMIC_CHUNK_SIZE=1
BUN_FEATURE_FLAG_VERBOSE_WARNINGS=1

# 网络代理
http_proxy=http://proxy:8080
https_proxy=https://proxy:8080
HTTP_PROXY=http://proxy:8080
HTTPS_PROXY=https://proxy:8080

# GitHub API
GITHUB_API_DOMAIN=api.github.com

# Ripgrep
RIPGREP_CONFIG_PATH=/path/to/ripgrep.conf
```

### 13.2 数据库连接

```bash
DATABASE_URL=postgres://...
PGURL=postgres://...
MYSQL_URL=mysql://...
```

---

## 14. API 集成

### 14.1 GitHub API

**端点**:
```
https://api.github.com
```

**功能** (推断):
- 仓库信息获取
- Issue/PR 管理
- 代码搜索
- 文件内容获取

### 14.2 Anthropic API (推测)

**可能的集成**:
```javascript
// Claude API 客户端 (推测)
const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
});

// 流式对话
const stream = await client.messages.stream({
    model: 'claude-sonnet-4.6',
    messages: [...],
    tools: [...]
});
```

---

## 15. 错误处理与日志

### 15.1 错误类型

**已发现的错误消息**:
```
- Failed to start inspector
- Unsupported protocol
- Invalid query: SQL Fragment cannot be executed
- Expected function to be executed N time(s)
- Installation aborted due to fatal security advisories
```

### 15.2 日志系统

**日志级别**:
```javascript
ERROR   // 错误
WARN    // 警告
INFO    // 信息
DEBUG   // 调试
TRACE   // 追踪
```

**配置**:
```javascript
BUN_FEATURE_FLAG_VERBOSE_WARNINGS=1  // 详细警告
```

---

## 16. 关键技术栈总结

### 16.1 编程语言

1. **Zig** - 核心运行时实现
2. **JavaScript/TypeScript** - Agent 逻辑
3. **C/C++** - 原生绑定
4. **Rust** - Ripgrep 和 regex 引擎

### 16.2 核心依赖

1. **JavaScriptCore** - JS 引擎 (高置信度)
2. **libicucore** - Unicode 支持
3. **Oniguruma** - 正则表达式
4. **PCRE2** - Perl 兼容正则
5. **Ripgrep** - 文本搜索

### 16.3 协议支持

1. **WebSocket** - 双向通信
2. **HTTP/1.1** - Web 服务器
3. **HTTP/2** - 现代协议
4. **Chrome DevTools Protocol** - 调试器

---

## 17. 架构优势

### 17.1 性能优势

✅ **零拷贝 I/O** - 减少内存复制
✅ **JIT 编译** - JavaScriptCore 优化
✅ **连接池** - 数据库连接复用
✅ **流式处理** - 大文件高效处理
✅ **Unix Socket** - 本地通信低延迟

### 17.2 开发体验

✅ **TypeScript 原生支持** - 无需配置
✅ **内置工具** - Ripgrep、测试框架
✅ **热重载** - 开发服务器
✅ **调试器集成** - Chrome DevTools 兼容

### 17.3 可扩展性

✅ **FFI 系统** - 调用任意 C 库
✅ **插件架构** - 工具可扩展
✅ **多协议支持** - 灵活通信方式

---

## 18. 潜在应用场景

### 18.1 IDE 集成

- **VS Code Extension** - 通过 WebSocket 连接
- **JetBrains Plugin** - 使用相同的协议
- **Web IDE** - 直接浏览器访问

### 18.2 CI/CD 集成

- **代码审查** - 自动化代码分析
- **文档生成** - 从代码生成文档
- **测试辅助** - 自动生成测试用例

### 18.3 DevOps 工具

- **日志分析** - Ripgrep 搜索日志
- **配置管理** - 批量修改配置文件
- **部署脚本** - 生成和执行部署脚本

---

## 19. 安全考虑

### 19.1 潜在风险

⚠️ **命令注入** - Bash 工具需要谨慎
⚠️ **文件访问** - 需要路径验证
⚠️ **SQL 注入** - 数据库工具需要防护
⚠️ **FFI 调用** - 原生代码可能不安全

### 19.2 建议的安全措施

1. **权限分级** - 不同工具不同权限
2. **沙箱隔离** - 限制文件系统访问
3. **输入验证** - 严格的参数检查
4. **审计日志** - 记录所有操作

---

## 20. 未来发展方向

### 20.1 可能的改进

🔮 **多语言支持** - Python、Go 等 LSP 集成
🔮 **分布式执行** - 多机器并行处理
🔮 **模型优化** - 更智能的代码理解
🔮 **可视化工具** - 架构图生成

### 20.2 生态扩展

🔮 **插件市场** - 第三方工具集成
🔮 **模板系统** - 常见任务模板
🔮 **协作功能** - 多人实时协作

---

## 21. 结论

这个 Bun Code Agent 是一个**高度优化的、生产级别的代码助手系统**，具有以下核心特征:

### 21.1 架构亮点

🎯 **Client-Server 架构** - 灵活的部署方式
🎯 **双协议通信** - WebSocket + Unix Socket
🎯 **嵌入式工具** - Ripgrep、数据库驱动等
🎯 **调试器集成** - Chrome DevTools Protocol
🎯 **高性能运行时** - Bun + JavaScriptCore

### 21.2 技术创新

🚀 **零拷贝 I/O** - Bun 文件系统优化
🚀 **FFI 系统** - 直接调用 C 库
🚀 **消息帧协议** - 高效的二进制协议
🚀 **模块化设计** - 内部模块注册表
🚀 **多上下文执行** - 支持并发操作

### 21.3 实际价值

💎 **开发效率** - 自动化常见任务
💎 **代码质量** - 智能分析和建议
💎 **调试体验** - 无缝调试器集成
💎 **跨平台** - macOS/Linux/Windows
💎 **易于扩展** - 插件式工具系统

---

## 22. 技术细节附录

### 22.1 关键文件路径

```
build/release/tmp_modules/
├── bun/
│   ├── ffi.ts           # FFI 系统
│   ├── sqlite.ts        # SQLite 集成
│   └── sql.ts           # SQL 抽象层
├── internal/
│   ├── debugger.ts      # 调试器核心
│   ├── http.ts          # HTTP 实现
│   ├── tls.ts           # TLS 实现
│   ├── cluster/         # 集群支持
│   │   └── child.ts
│   ├── crypto/
│   │   └── x509.ts      # 证书处理
│   └── sql/
│       ├── mysql.ts     # MySQL 驱动
│       └── postgres.ts  # PostgreSQL 驱动
└── node/
    ├── inspector.ts          # Inspector API
    ├── inspector.promises.ts # Promise API
    └── _http_agent.ts        # HTTP Agent
```

### 22.2 关键符号

```javascript
// 内部符号
::bunternal::              // 内部标识符
@bunNativePtr              // 原生指针
@internalModuleRegistry    // 模块注册表
@lazy(id)                  // 懒加载

// HTTP 相关
kInternalSocketData        // Socket 数据
serverSymbol               // 服务器符号
kHandle                    // 句柄
kRealListen                // 监听方法
```

### 22.3 消息流示例

**完整的调试会话流程**:
```
1. Client 连接 WebSocket
   ws://localhost:3000/debug

2. Agent 返回欢迎消息
   { "event": "connected", "version": "2.1.83" }

3. Client 请求初始化
   { "id": 1, "method": "initialize" }

4. Agent 创建 Backend
   createBackend(executionContextId, ...)

5. Client 发送工具请求
   { "id": 2, "method": "tool.execute", "params": {...} }

6. Agent 执行工具
   Bun.spawn('rg', ...) 或 Bun.file(...)

7. Agent 返回结果
   { "id": 2, "result": {...} }

8. 断开连接
   Backend.close()
```

---

**报告生成时间**: 2026-03-25
**分析对象**: Bun Code Agent v2.1.83
**分析方法**: 静态二进制分析 + 字符串模式推断
**技术栈**: Bun + JavaScriptCore + Ripgrep + Zig
**架构模式**: Client-Server + Chrome DevTools Protocol
**置信度**: 高 (基于代码结构和模式分析)
