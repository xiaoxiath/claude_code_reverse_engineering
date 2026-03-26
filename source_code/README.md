# 提取的源码说明

## 文件说明

### bun_extracted_full.js

**大小**: 6.9 MB
**行数**: 60,674 行
**格式**: JavaScript (混淆)
**来源**: Bun 2.1.83 二进制文件

## 关键代码位置

| 功能 | 行号范围 | 说明 |
|------|---------|------|
| Claude Code 版权信息 | 46198-46207 | 版本 2.1.83 |
| Agent 类 (Sp9) | 48540-48740 | 核心 Agent 实现 |
| Socket 客户端 (T58) | 46238-46338 | Socket 通信 |
| MCP 命名系统 | 46315 | 工具名格式 |
| 权限规则解析 | 46315 | 转义处理 |
| Tool Registry | 46315 | 名称映射 |
| 消息持久化 | 46238 | JSONL 存储 |

## 代码特点

### 1. 深度混淆

变量名完全随机化：
- `Sp9` → Agent 类
- `cS` → 主循环生成器
- `vFT` → 消息处理器
- `ymT` → 事件生成器
- `T58` → Socket 客户端

### 2. CommonJS 模块

大部分代码使用 CommonJS 包装：
```javascript
(function(__filename, __dirname, require, module, exports) {
  // 模块代码
})
```

### 3. Bun API

使用 Bun 原生 API：
- `Bun.file()` - 文件操作
- `Bun.Glob()` - 模式匹配
- `Bun.spawn()` - 进程管理

## 使用建议

### 搜索特定功能

```bash
# 搜索 Agent 类
grep -n "class Sp9" bun_extracted_full.js

# 搜索事件处理
grep -n "switch.*type" bun_extracted_full.js

# 搜索 MCP 相关
grep -n "mcp__" bun_extracted_full.js
```

### 提取特定代码段

```bash
# 提取 Agent 类
sed -n '48540,48740p' bun_extracted_full.js > agent.js

# 提取 Socket 客户端
sed -n '46238,46338p' bun_extracted_full.js > socket.js
```

## 注意事项

⚠️ **代码混淆严重**
- 变量名无意义
- 控制流复杂
- 需要耐心分析

⚠️ **不是完整源码**
- 这是编译后的代码
- 部分函数被内联
- 需要反向工程理解

⚠️ **仅供学习研究**
- 不要用于商业用途
- 尊重知识产权
- 遵守许可协议

## 相关文档

- 提取方法: `documentation/EXTRACTION_METHODOLOGY.md`
- 架构概览: `documentation/ARCHITECTURE_OVERVIEW.md`
- 实现指南: `documentation/CORE_FUNCTIONS_IMPLEMENTATION_GUIDE.md`
- 最终分析: `reports/FINAL_REVERSE_ENGINEERING_ANALYSIS.md`

## 提取日期

**日期**: 2026-03-25
**版本**: Bun 2.1.83
**方法**: 静态分析 + 字符串提取
**验证率**: 95%
