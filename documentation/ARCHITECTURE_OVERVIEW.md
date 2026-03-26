# Claude Code 架构概览

## 系统架构

本文档提供 Claude Code 的完整架构概览，基于逆向工程提取的代码。

---

## 🏗️ 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                        Claude Code                           │
│                    (Bun 2.1.83 Binary)                      │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
   ┌────▼────┐        ┌────▼────┐        ┌────▼────┐
   │  Agent  │        │   MCP   │        │  Tools  │
   │  Core   │        │ Protocol│        │ System  │
   └─────────┘        └─────────┘        └─────────┘
        │                   │                   │
        ├─ Event Loop       ├─ Socket Client    ├─ Tool Registry
        ├─ Message Queue    ├─ Stdio Transport  ├─ Permission
        ├─ Token Tracking   ├─ Naming System    ├─ Execution
        └─ Compression      └─ Server Mgmt      └─ Validation
```

---

## 📦 核心模块

### 1. Agent 系统 (Sp9)

**位置**: Line 48540-48740

**职责**:
- 会话管理
- 消息处理
- 事件循环
- 资源控制

**关键组件**:
```javascript
class Sp9 {  // Agent
  config;                    // 配置
  mutableMessages;           // 消息队列
  abortController;           // 中断控制
  permissionDenials;         // 权限拒绝
  totalUsage;                // Token 使用
  discoveredSkillNames;      // 技能发现
}
```

### 2. MCP 协议栈

**命名系统**:
```
mcp__${serverName}__${toolName}
```

**通信方式**:
- Socket (T58) - 自动重连
- Stdio (WS_) - 进程通信

**组件**:
- Socket 客户端 (Line 46238-46338)
- Stdio 传输 (Line 46238)
- 命名解析 (Line 46315)

### 3. 工具系统

**Tool Registry**:
```javascript
var t28 = {
  Task: T9,
  KillShell: wb,
  AgentOutputTool: qZ,
  BashOutputTool: qZ,
  ...
}
```

**权限控制**:
```javascript
// 格式: ToolName(ruleContent)
// 示例: Bash(rm -rf *)
```

---

## 🔄 数据流

### 用户请求流程

```
用户输入
    ↓
submitMessage(input, options)
    ↓
┌─────────────────────────┐
│ 1. 配置解构              │
│    - cwd, tools, etc.   │
└─────────────────────────┘
    ↓
┌─────────────────────────┐
│ 2. 权限检查              │
│    - canUseTool         │
└─────────────────────────┘
    ↓
┌─────────────────────────┐
│ 3. 系统提示构建          │
│    - getSystemPrompt    │
└─────────────────────────┘
    ↓
┌─────────────────────────┐
│ 4. 工具上下文设置        │
│    - toolUseContext     │
└─────────────────────────┘
    ↓
┌─────────────────────────┐
│ 5. 消息处理              │
│    - vFT() ⚠️           │
│    - 压缩、过滤          │
└─────────────────────────┘
    ↓
┌─────────────────────────┐
│ 6. 主循环                │
│    - cS() ⚠️            │
│    - API 调用            │
│    - 事件生成            │
└─────────────────────────┘
    ↓
事件流输出
```

---

## 🎯 事件系统

### Agent 事件 (8种)

```javascript
switch (event.type) {
  case "tombstone":        // 墓碑
  case "assistant":        // 助手消息
  case "user":             // 用户消息
  case "stream_event":     // 流式事件
  case "attachment":       // 附件
  case "system":           // 系统消息
  case "tool_use_summary": // 工具摘要
  case "progress":         // 进度
}
```

### 流式事件 (6种)

```javascript
// Server-Sent Events
event: message_start
event: content_block_start
event: content_block_delta
event: content_block_stop
event: message_delta
event: message_stop
```

---

## ⚙️ 配置系统

### 6 层优先级

```
1. 策略配置 (policySettings)     - 最高优先级
    ↓
2. 远程管理配置
    ↓
3. 企业配置
    ↓
4. 全局配置 (~/.claude/config.json)
    ↓
5. 项目配置 (.claude/config.json)
    ↓
6. 默认配置                      - 最低优先级
```

### 配置合并

```javascript
// 数组: 合并并去重
// 对象: 递归合并
// 原语: 覆盖
function FU(_, T, q) { /* 递归合并 */ }
```

---

## 🔐 权限系统

### 权限规则格式

```
ToolName(ruleContent)
```

**示例**:
```
Bash                      // 允许所有 Bash 命令
Bash(rm *)               // 允许所有 rm 命令
Bash(rm -rf *)           // 允许所有 rm -rf 命令
Read(/tmp/*)             // 允许读取 /tmp 下的文件
```

### 转义支持

```javascript
// 转义函数
function yA4(_) {
  return _.replace(/\\/g, "\\\\")
           .replace(/\(/g, "\\(")
           .replace(/\)/g, "\\)")
}

// 反转义函数
function VA4(_) {
  return _.replace(/\\\(/g, "(")
           .replace(/\\\)/g, ")")
           .replace(/\\\\/g, "\\")
}
```

---

## 🔌 Hook 系统

### 12 种 Hook 事件

```javascript
hooks: {
  PreToolUse: [...],        // 工具使用前
  PostToolUse: [...],       // 工具使用后
  Notification: [...],      // 通知
  UserPromptSubmit: [...],  // 用户提交
  SessionStart: [...],      // 会话开始
  SessionEnd: [...],        // 会话结束
  Stop: [...],              // 停止
  SubagentStop: [...],      // 子 Agent 停止
  PreCompact: [...],        // 压缩前
  PostCompact: [...],       // 压缩后
  TeammateIdle: [...],      // 队友空闲
  TaskCompleted: [...]      // 任务完成
}
```

---

## 💾 持久化

### 消息存储

**格式**: JSONL (JSON Lines)

**位置**: `.claude/sessions/{session-id}.jsonl`

**结构**:
```
每行一个 JSON 对象
{"type":"user","message":{...},"uuid":"...","timestamp":...}
{"type":"assistant","message":{...},"uuid":"...","timestamp":...}
```

### 读取逻辑

```javascript
function bO4(buffer) {
  // BOM 检测
  if (buffer[0] === 239 && ...) offset = 3;
  
  // 逐行解析
  while (offset < length) {
    let newline = buffer.indexOf(10, offset);
    let line = buffer.toString("utf8", offset, newline);
    result.push(JSON.parse(line));
  }
}
```

---

## 📊 Token 追踪

### 使用量统计

```javascript
totalUsage = {
  inputTokens: 0,
  outputTokens: 0,
  cacheReadInputTokens: 0,
  cacheCreationInputTokens: 0
}
```

### 实时更新

```javascript
// 流式事件处理
if (event.type === "message_start") {
  usage = event.message.usage;
}
if (event.type === "message_delta") {
  usage = event.usage;
}
if (event.type === "message_stop") {
  totalUsage = merge(totalUsage, usage);
}
```

---

## 🔧 工具集成

### Bun API

**文件操作**:
```javascript
Bun.file(path, options)
Bun.Glob(pattern)
```

**进程管理**:
```javascript
Bun.spawn({cmd, cwd, env})
Bun.spawnSync({cmd, cwd, env})
```

### SQLite

**适配器** (95% 提取):
```javascript
class SQLiteAdapter {
  db: sqlite3.Database;
  
  async query(sql, params) { /* ... */ }
  async run(sql, params) { /* ... */ }
  close() { /* ... */ }
}
```

---

## 🎨 ContentBlock 系统

### 8 种块类型

```typescript
type ContentBlock =
  | TextBlock
  | ThinkingBlock
  | ToolUseBlock
  | ToolResultBlock
  | ImageBlock
  | DocumentBlock
  | CodeExecutionBlock
  | WebSearchResultBlock;
```

### 流式处理

```javascript
// TryPick 模式
if (streamEvent.TryPickContentBlockDelta(out var delta)) {
  // 处理增量
}
```

---

## ⚠️ 未完成的部分

### 深度混淆的核心函数

1. **cS** - 主循环生成器
   - 调用 Claude API
   - 流式处理响应
   - 事件生成

2. **vFT** - 消息处理器
   - 上下文压缩算法
   - 工具过滤
   - 模型选择

3. **ymT** - 事件生成器
   - 消息转事件
   - 流式转发

**状态**: 无法通过静态分析提取

---

## 📈 性能特性

### 自动重连

```javascript
maxReconnectAttempts: 10
reconnectDelay: 1000ms
// 指数退避: delay * Math.pow(2, attempts - 1)
```

### 预算控制

```javascript
if (gD() >= maxBudgetUsd) {
  yield { type: "result", subtype: "error_max_budget_usd" };
  return;
}
```

### 最大轮次

```javascript
if (turnCount >= maxTurns) {
  yield { type: "result", subtype: "error_max_turns" };
  return;
}
```

---

## 🎯 架构亮点

### 1. 模块化设计

- 清晰的职责分离
- 松耦合的组件
- 易于扩展

### 2. 事件驱动

- 异步事件流
- 流式处理
- 实时响应

### 3. 配置灵活

- 6 层优先级
- 递归合并
- 热重载

### 4. 安全可靠

- 权限控制
- 沙箱隔离
- 错误诊断

### 5. 可扩展

- 插件系统
- Hook 机制
- MCP 协议

---

**架构总结**: 一个设计精良的、生产级的 AI Agent 系统

**日期**: 2026-03-25
**版本**: 1.0.0
