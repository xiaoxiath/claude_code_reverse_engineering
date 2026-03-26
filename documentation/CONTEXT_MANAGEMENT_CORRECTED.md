# 上下文管理纠正报告

> **目的**: 纠正原 `restored/` 代码中虚假的上下文管理实现
> **来源**: Claude Code v2.1.83 逆向分析
> **置信度标注**: [CONFIRMED] = 从代码直接提取; [INFERRED] = 从调用点推断

---

## 1. 原项目中的错误

### 1.1 虚假的 5 种客户端策略

原 `restored/src/context/manager.ts` 和 `restored/src/context/compression.ts` 实现了以下**虚构的**客户端压缩策略：

```typescript
// ❌ 错误! 以下策略在实际代码中不存在
enum CompressionStrategy {
  SLIDING_WINDOW,     // ← 虚构
  SMART_SUMMARY,      // ← 虚构
  PRIORITY_BASED,     // ← 虚构
  HYBRID,             // ← 虚构
  NONE                // ← 部分正确
}
```

这些策略是完全臆造的。Claude Code **不在客户端做消息裁剪或压缩**。

### 1.2 虚假的 Token 精确计数实现

原代码包含复杂的客户端 tokenizer 模拟：

```typescript
// ❌ 错误! Claude Code 不做客户端 token 精确计数
class TokenCounter {
  private tokenize(text: string): number {
    // 复杂的 BPE 模拟...
  }
}
```

实际上，Claude Code 使用三层 token 计数，其中精确计数是通过 API 完成的，不是在客户端模拟。

### 1.3 虚假的消息优先级系统

```typescript
// ❌ 错误! 不存在此系统
interface MessagePriority {
  importance: number;
  recency: number;
  relevance: number;
}
```

---

## 2. 真实的上下文管理架构

### 2.1 核心发现: Server-Side Compaction [CONFIRMED]

Claude Code 使用 Anthropic API 的 `compact-2026-01-12` Beta 进行**服务端**上下文压缩。
客户端不做任何复杂的消息裁剪、优先级排序或摘要生成。

### 2.2 Compaction 触发条件 [INFERRED]

当对话接近 200K context window 限制时，API 服务端自动触发压缩。
客户端只需正确处理返回的 `compact_boundary` 消息。

### 2.3 完整 Compaction 流程 [CONFIRMED]

```
1. 客户端发送 messages 到 API
   ├─ headers 包含: beta = "compact-2026-01-12"
   └─ messages 可能已经很长

2. API 服务端检测到接近 context window 限制

3. API 进行服务端压缩
   ├─ 压缩早期上下文为摘要
   └─ 保留近期消息不变

4. API 返回 compact_boundary 事件
   ├─ type: "system"
   ├─ subtype: "compact_boundary"
   └─ compactMetadata: {
        preservedSegment: {
          tailUuid: string  // 保留段末尾的消息 UUID
        }
      }

5. 客户端处理 compact_boundary
   ├─ 查找 tailUuid 对应的消息索引 b_
   ├─ this.mutableMessages.splice(0, b_)  // 截断边界之前的消息
   └─ 设置 ZT.pendingPostCompaction = true

6. Hook 触发
   ├─ PreCompact hook (压缩前)
   └─ PostCompact hook (压缩后)
```

### 2.4 compact_boundary 消息结构 [CONFIRMED]

```json
{
  "type": "system",
  "subtype": "compact_boundary",
  "compactMetadata": {
    "preservedSegment": {
      "tailUuid": "uuid-of-last-preserved-message"
    }
  }
}
```

---

## 3. 三层 Token 计数 [CONFIRMED]

### 3.1 快速估算 (客户端)

```javascript
// [CONFIRMED] 从代码提取
function quickEstimate(text) {
  return Math.ceil(text.length / 4);  // 简单字符数/4
}

function imageTokenEstimate() {
  return 1600;  // 图片固定 1600 tokens
}
```

**用途**: 预检判断、快速过滤
**精度**: 低 (仅粗略估算)

### 3.2 精确计数 (API)

```javascript
// [CONFIRMED] 使用 Anthropic SDK 的 count_tokens API
const response = await client.messages.countTokens({
  model: modelId,
  messages: messages,
  system: systemPrompt,
  tools: toolDefinitions
});
// response.input_tokens: number
```

**用途**: 精确计算 system prompt + messages 的 token 数
**精度**: 高

### 3.3 真实统计 (API 响应)

```javascript
// [CONFIRMED] 从 API 响应的 usage 字段
// 在 stream_event 的 message_start 和 message_delta 中
usage = {
  input_tokens: number,
  output_tokens: number,
  cache_read_input_tokens: number,
  cache_creation_input_tokens: number
}
```

**用途**: 精确的计费和统计
**精度**: 精确

### 3.4 Token 追踪函数 [CONFIRMED]

| 函数 | 用途 |
|---|---|
| `F8_()` | 累加单次 API 调用的 usage |
| `GmT()` | 合并到 Sp9.totalUsage |
| `gD()` | 获取总花费 USD |
| `gE()` | 获取按模型分类的 usage |

---

## 4. MCP 输出截断 [INFERRED]

MCP 工具输出有 token 限制，但这是**输出截断**而非上下文压缩：

```javascript
// 默认值, 可通过环境变量覆盖
MAX_MCP_OUTPUT_TOKENS = 25000;  // CLAUDE_CODE_MAX_MCP_OUTPUT_TOKENS

// 快速预检: 如果 token 估算 < 阈值的一半, 直接通过
if (quickEstimate(output) < MAX_MCP_OUTPUT_TOKENS * 0.5) {
  return output; // 12500 tokens 以下直接放行
}

// 字符截断: 使用 4x 字符/token 比率
if (output.length > MAX_MCP_OUTPUT_TOKENS * 4) {
  output = output.slice(0, MAX_MCP_OUTPUT_TOKENS * 4); // 100000 字符
  output += "\n... [output truncated]";
}
```

---

## 5. Prompt Caching [CONFIRMED]

### 5.1 System Prompt 缓存

```javascript
// [CONFIRMED] System Prompt 标记为可缓存
systemPrompt = [{
  type: "text",
  text: systemPromptText,
  cache_control: { type: "ephemeral" }
}];
```

### 5.2 缓存追踪

```javascript
// [CONFIRMED] 从 API 响应追踪缓存效果
usage = {
  cache_read_input_tokens: 15000,     // 命中缓存的 tokens
  cache_creation_input_tokens: 20000   // 新创建缓存的 tokens
};
```

### 5.3 缓存白名单

```javascript
// ZT.promptCache1hAllowlist: 1小时缓存白名单
// 控制哪些内容可以使用较长的缓存 TTL
```

---

## 6. 会话持久化 [CONFIRMED]

### 6.1 JSONL 格式

```
// 每行一个 JSON 对象
{"role":"user","content":"Hello"}
{"role":"assistant","content":[{"type":"text","text":"Hi!"}]}
{"role":"user","content":[{"type":"tool_result","tool_use_id":"id_1","content":"output"}]}
```

**路径**: `~/.claude/projects/<hash>/memory/`

### 6.2 Compact-Aware 读取 [CONFIRMED]

```javascript
// T4T() 函数: 读取 JSONL 会话文件
// 如果文件中包含 compact_boundary, 自动丢弃之前的内容
function T4T(filePath) {
  let lines = readLines(filePath);
  let compactIndex = -1;

  // cO4() — 预编译的 Buffer 用于快速查找 "compact_boundary"
  for (let i = lines.length - 1; i >= 0; i--) {
    if (cO4(lines[i])) {
      compactIndex = i;
      break;
    }
  }

  if (compactIndex >= 0) {
    // 丢弃 compact_boundary 之前的所有内容
    lines = lines.slice(compactIndex + 1);
  }

  return lines.map(JSON.parse);
}
```

### 6.3 高效检测 [CONFIRMED]

```javascript
// cO4() — 使用预编译的 Buffer 进行快速 compact_boundary 检测
// 避免对每一行都做完整 JSON 解析
let COMPACT_MARKER = Buffer.from("compact_boundary");

function cO4(line) {
  if (typeof line === 'string') {
    return line.includes("compact_boundary");
  }
  return Buffer.isBuffer(line) && line.includes(COMPACT_MARKER);
}
```

---

## 7. 事件流中的上下文管理 [CONFIRMED]

### 7.1 submitMessage 中的 compact_boundary 处理

```javascript
// [CONFIRMED] 在 Sp9.submitMessage() 的事件循环中
for await (let event of cS({...})) {
  switch (event.type) {
    case "system":
      if (event.subtype === "compact_boundary") {
        // 查找 preservedSegment.tailUuid 对应的消息索引
        let tailUuid = event.compactMetadata.preservedSegment.tailUuid;
        let b_ = this.mutableMessages.findIndex(
          msg => msg.uuid === tailUuid
        );
        if (b_ >= 0) {
          // 截断边界之前的所有消息
          this.mutableMessages.splice(0, b_);
        }
        // 标记待处理的压缩后操作
        ZT.pendingPostCompaction = true;
      }
      break;
    // ... 其他事件类型
  }
}
```

### 7.2 API 请求中的 Beta 标记 [CONFIRMED]

```javascript
// 请求头包含 compact beta 标识
headers: {
  "anthropic-beta": "compact-2026-01-12"
}
```

---

## 8. 与原项目的对比表

| 方面 | 原项目 (错误) | 实际实现 (正确) |
|---|---|---|
| 压缩位置 | 客户端 5 种策略 | 服务端 compact-2026-01-12 |
| 消息裁剪 | 客户端优先级排序 + 滑动窗口 | 服务端自动压缩, 客户端 splice |
| Token 计数 | 客户端 BPE 模拟 | 3 层: 估算/API/真实 |
| 持久化格式 | 未实现 | JSONL |
| Compact 读取 | 不存在 | T4T() compact-aware |
| 缓存策略 | 未实现 | cache_control: ephemeral |
| MCP 截断 | 不存在 | 25000 token 限制 |
| Hook 集成 | 不存在 | PreCompact/PostCompact |

---

## 9. 正确的实现要点

### 9.1 客户端需要做的

1. **发送 API 请求时**: 添加 `anthropic-beta: compact-2026-01-12` 头
2. **处理 compact_boundary**: splice mutableMessages
3. **快速 token 估算**: 字符数/4 (仅用于预检)
4. **MCP 输出截断**: 限制 25000 tokens
5. **System Prompt 缓存**: 标记 `cache_control: { type: "ephemeral" }`
6. **JSONL 持久化**: 每行一个消息 JSON
7. **读取会话时**: compact-aware — 检测 compact_boundary 并丢弃之前内容

### 9.2 客户端不需要做的

1. ~~消息优先级排序~~
2. ~~滑动窗口压缩~~
3. ~~智能摘要生成~~
4. ~~混合压缩策略~~
5. ~~客户端 BPE tokenizer~~
6. ~~手动上下文窗口管理~~

---

*纠正基于 claude_code_agent.js v2.1.83 (build 2026-03-25T05:15:24Z) 逆向分析*
