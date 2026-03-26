# Claude Code 逆向工程 - 文件索引

## 📁 目录结构

```
claude_code_reverse_engineering/
│
├── README.md                          # 项目主文档
├── INDEX.md                           # 本文件
├── CHANGELOG.md                       # 变更日志 (2026-03-26 新增)
├── TODO.md                            # 剩余工作清单
├── CLAUDE.md                          # 项目指南
│
├── source_code/                       # 提取的源码
│   ├── bun_extracted_full.js          # 完整 JavaScript bundle (6.9MB)
│   └── README.md                      # 源码使用说明
│
├── reports/                           # 分析报告 (28个)
│   │
│   ├── 核心报告 (11个)
│   │   ├── BINARY_EXTRACTION_REPORT.md
│   │   ├── AGENT_EXTRACTION_REPORT.md
│   │   ├── CORE_FUNCTIONALITY_EXTRACTION_REPORT.md
│   │   ├── FEATURE_EXTRACTION_REPORT_3.md
│   │   ├── SUPPLEMENTARY_EXTRACTION_REPORT_4.md
│   │   ├── CORE_FUNCTIONS_ANALYSIS_REPORT_5.md
│   │   ├── COMPREHENSIVE_PROGRESS_REPORT.md
│   │   ├── FINAL_COMPREHENSIVE_REPORT.md
│   │   ├── SUMMARY_REPORT.md
│   │   ├── FINAL_SUMMARY.md
│   │   └── PROJECT_FINAL_SUMMARY.md
│   │
│   ├── 最终分析 (1个)
│   │   └── FINAL_REVERSE_ENGINEERING_ANALYSIS.md
│   │
│   ├── 架构和设计 (4个)
│   │   ├── ARCHITECTURE_DESIGN_SUMMARY.md
│   │   ├── CODE_AGENT_ARCHITECTURE_DESIGN.md
│   │   ├── CODE_RESTORATION_FINAL_REPORT.md
│   │   └── CONTEXT_MANAGEMENT_REPORT.md
│   │
│   ├── 代码还原 (3个)
│   │   ├── CODE_RESTORATION_REPORT.md
│   │   ├── CODE_RESTORATION_PROGRESS_2.md
│   │   └── HONEST_ANALYSIS_REPORT.md
│   │
│   ├── 深度逆向 (7个)
│   │   ├── DEEP_EXTRACTION_PHASE3_REPORT.md
│   │   ├── DEEP_EXTRACTION_PHASE4_REPORT.md
│   │   ├── DEEP_EXTRACTION_PHASE5_REPORT.md
│   │   ├── DEEP_EXTRACTION_PHASE6_REPORT.md
│   │   ├── DEEP_REVERSE_FINAL_SUMMARY.md
│   │   ├── DEEP_TECHNICAL_DETAILS.md
│   │   └── EXTREME_REVERSE_ENGINEERING_REPORT.md
│   │
│   ├── 状态与诚实评估 (4个)
│   │   ├── HONEST_REVIEW_REPORT.md
│   │   ├── PROJECT_STATUS_CORRECTION.md
│   │   ├── PROJECT_COMPLETION_SUMMARY.md
│   │   └── RESTORED_WRITE_REPORT.md
│   │
│   └── 分析报告 (9个)
│       ├── FEATURE_ANALYSIS.md
│       ├── FINAL_SUMMARY_REPORT.md
│       ├── STATE_ERROR_PLUGIN_ARCHITECTURE.md
│       ├── EXTRACTED_INFORMATION_SUMMARY.md
│       ├── bun_2.1.83_reverse_engineering_report.md
│       ├── bun_business_code_location_analysis.md
│       ├── bun_business_logic_deep_analysis.md
│       ├── bun_code_agent_architecture_analysis.md
│       ├── bun_embedded_code_reverse_analysis.md
│       └── bun_vs_claude_code_comparison.md
│
├── extracted_code/                    # (已废弃，使用 source_code/)
│   └── bun_extracted_full.js          # 旧的源码位置
│
├── documentation/                     # 项目文档 (3个)
│   ├── EXTRACTION_METHODOLOGY.md      # 提取方法论
│   ├── ARCHITECTURE_OVERVIEW.md       # 架构概览
│   └── CORE_FUNCTIONS_IMPLEMENTATION_GUIDE.md  # 核心函数实现指南
│
└── restored/                          # 参考实现 (2026-03-26 深度重写)
    ├── package.json                   # 项目配置 (已更新依赖)
    ├── tsconfig.json                  # TypeScript 配置
    ├── README.md                      # 参考实现说明
    ├── REVERSE_ENGINEERING_SOURCES.md # 逆向工程来源
    │
    └── src/
        ├── index.ts                   # ★ 入口文件 (基于 awO() 调用链重写)
        │
        ├── agent/
        │   └── Agent.ts               # Agent 核心类
        │
        ├── core/
        │   ├── implementations.ts     # ★ 核心实现 (C8/yo/uw_ 重写)
        │   └── reconnection.ts        # 重连逻辑
        │
        ├── config/
        │   ├── manager.ts             # ★ 配置管理器 (优先级+env重写)
        │   └── socket.config.ts       # Socket 配置
        │
        ├── session/
        │   └── manager.ts             # ★ 会话管理器 (JSONL持久化重写)
        │
        ├── memory/
        │   └── manager.ts             # ★ 记忆管理器 (V5+CLAUDE.md重写)
        │
        ├── context/
        │   ├── manager.ts             # 上下文管理器
        │   ├── compression.ts         # 上下文压缩
        │   └── tools.ts               # 上下文工具
        │
        ├── llm/
        │   └── client.ts              # LLM 客户端
        │
        ├── tools/
        │   ├── registry.ts            # 工具注册表
        │   └── implementations.ts     # 工具实现
        │
        ├── permissions/
        │   └── manager.ts             # 权限管理器
        │
        └── types/
            ├── index.ts               # 类型导出入口
            ├── tool.types.ts          # ★ 工具类型 (9字段接口重写)
            ├── hook.types.ts          # ★ Hook类型 (24事件+4类型重写)
            ├── permission.types.ts    # ★ 权限类型 (6模式+3分类重写)
            ├── state.types.ts         # ★ 状态类型 (ZT单例80+字段重写)
            ├── config.types.ts        # ★ 配置类型 (Sandbox schema重写)
            ├── agent.types.ts         # Agent 类型
            ├── session.types.ts       # Session 类型
            ├── error.types.ts         # 错误类型
            ├── error.codes.ts         # 错误码
            ├── mcp.types.ts           # MCP 协议类型
            ├── plugin.types.ts        # 插件类型
            ├── stream.types.ts        # 流式类型
            ├── budget.types.ts        # 预算类型
            ├── cache.types.ts         # 缓存类型
            ├── sse.types.ts           # SSE 类型
            ├── filesystem.types.ts    # 文件系统类型
            ├── compression-crypto.types.ts  # 压缩加密类型
            ├── websocket-http2.types.ts     # WebSocket/HTTP2 类型
            ├── package-cli.types.ts   # 包管理/CLI 类型
            └── test-build.types.ts    # 测试/构建类型
```

> 标记 ★ 的文件为 2026-03-26 深度逆向分析后重写的文件。

---

## 📊 统计信息

- **总文件数**: 约 65 个（含报告、文档、类型、实现）
- **报告文件**: 28 个
- **源码文件**: 1 个 (6.9MB, 60,674 行混淆代码)
- **文档文件**: 3 个
- **类型定义**: 17 个 .ts 文件（其中 5 个深度重写）
- **实现代码**: 12 个 .ts 文件（其中 5 个深度重写）
- **总大小**: ~14 MB

---

## 🎯 快速导航

### 想快速了解项目？

→ 阅读 `README.md`（含 2026-03-26 深度分析补充章节）

### 想了解最终成果？

→ 阅读 `reports/PROJECT_FINAL_SUMMARY.md`
→ 阅读 `reports/FINAL_SUMMARY.md`
→ 阅读 `reports/FINAL_REVERSE_ENGINEERING_ANALYSIS.md`

### 想了解本次深度分析改动？

→ 阅读 `CHANGELOG.md`
→ 阅读 `README.md` 中的"深度逆向分析补充"章节

### 想了解核心函数？

→ 阅读 `reports/CORE_FUNCTIONS_ANALYSIS_REPORT_5.md`
→ 阅读 `documentation/CORE_FUNCTIONS_IMPLEMENTATION_GUIDE.md`
→ 查看 `restored/src/core/implementations.ts`（C8/yo/uw_ 实现）

### 想查看还原代码？

→ `restored/src/types/tool.types.ts` - Tool 接口 9 字段定义
→ `restored/src/types/state.types.ts` - ZT 全局状态 80+ 字段
→ `restored/src/core/implementations.ts` - Shell/读/写 核心实现
→ `restored/src/session/manager.ts` - JSONL 会话持久化
→ `restored/src/index.ts` - awO() 入口调用链

### 想查看源码？

→ 查看 `source_code/bun_extracted_full.js`
→ 阅读 `source_code/README.md`

### 想了解完整架构？

→ 阅读 `reports/FINAL_COMPREHENSIVE_REPORT.md`
→ 阅读 `documentation/ARCHITECTURE_OVERVIEW.md`

### 想了解提取方法？

→ 阅读 `documentation/EXTRACTION_METHODOLOGY.md`

### 想了解剩余工作？

→ 阅读 `TODO.md`

---

## 📖 推荐阅读顺序

### 初学者

1. README.md
2. PROJECT_FINAL_SUMMARY.md
3. FINAL_SUMMARY.md
4. ARCHITECTURE_OVERVIEW.md
5. source_code/README.md

### 开发者

1. CHANGELOG.md（了解最新改动）
2. restored/src/types/tool.types.ts（Tool 接口定义）
3. restored/src/core/implementations.ts（核心实现）
4. restored/src/index.ts（入口调用链）
5. FINAL_REVERSE_ENGINEERING_ANALYSIS.md

### 研究者

1. EXTRACTION_METHODOLOGY.md
2. COMPREHENSIVE_PROGRESS_REPORT.md
3. restored/src/types/state.types.ts（ZT 全局状态 80+ 字段）
4. restored/src/types/hook.types.ts（24 种 Hook 事件）
5. restored/src/types/permission.types.ts（6 种权限模式）

---

## 🔍 按主题查找

### 源码

- `source_code/bun_extracted_full.js` - 完整源码 (6.9MB)
- `source_code/README.md` - 源码说明

### Tool 系统（2026-03-26 重写）

- `restored/src/types/tool.types.ts` - 9 字段 Tool 接口
- `restored/src/tools/registry.ts` - 工具注册表
- `restored/src/tools/implementations.ts` - 工具实现

### Hook 系统（2026-03-26 重写）

- `restored/src/types/hook.types.ts` - 24 种事件 + 4 种 Hook 类型
- FEATURE_EXTRACTION_REPORT_3.md

### 权限系统（2026-03-26 重写）

- `restored/src/types/permission.types.ts` - 6 种权限模式 + 3 种验证分类
- `restored/src/permissions/manager.ts` - 权限管理器

### 全局状态（2026-03-26 重写）

- `restored/src/types/state.types.ts` - ZT 单例 80+ 字段

### 核心实现（2026-03-26 重写）

- `restored/src/core/implementations.ts` - C8() / yo() / uw_()
- `restored/src/session/manager.ts` - JSONL 持久化
- `restored/src/memory/manager.ts` - CLAUDE.md + memory 目录
- `restored/src/config/manager.ts` - 配置优先级 + 环境变量
- `restored/src/index.ts` - awO() 入口

### Agent 系统

- AGENT_EXTRACTION_REPORT.md
- FINAL_COMPREHENSIVE_REPORT.md (Agent 章节)
- CORE_FUNCTIONS_IMPLEMENTATION_GUIDE.md (cS 函数)

### 事件系统

- CORE_FUNCTIONALITY_EXTRACTION_REPORT.md
- FINAL_COMPREHENSIVE_REPORT.md (事件系统章节)

### MCP 协议

- BINARY_EXTRACTION_REPORT.md
- FINAL_COMPREHENSIVE_REPORT.md (MCP 章节)

### 配置系统（2026-03-26 重写）

- `restored/src/types/config.types.ts` - Sandbox 配置 schema
- `restored/src/config/manager.ts` - 配置优先级

### Token 追踪

- CORE_FUNCTIONALITY_EXTRACTION_REPORT.md
- SUPPLEMENTARY_EXTRACTION_REPORT_4.md

---

## 🎓 项目状态（2026-03-26 修正）

| 维度 | 完成度 | 可信度 |
|------|--------|--------|
| 架构理解 | 95% | 高 |
| 接口识别 | 92% | 高 |
| 类型定义还原 | 75% | 中高 |
| 核心实现还原 | 40% | 中 |
| 业务逻辑还原 | 15% | 低 |
| **综合** | **~55%** | — |

---

**文件索引版本**: 3.0.0
**更新日期**: 2026-03-26
**总文件数**: ~65
