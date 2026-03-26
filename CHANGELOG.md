# CHANGELOG

本文件记录 claude_code_reverse_engineering 仓库的所有显著变更。

---

## [3.0.0] - 2026-03-26 — 深度逆向分析重写

### 概述

基于对 `source_code/bun_extracted_full.js`（6.9MB, 60,674 行混淆代码）的 byte-offset 级静态分析，重写了 restored/ 目录下的核心类型定义和实现文件，将综合完成度从 ~35% 提升至 ~55%。

### 新增 (Added)

- **CHANGELOG.md** — 本文件，记录项目变更历史
- **README.md 新章节** "深度逆向分析补充 (2026-03-26)" — 统一了此前矛盾的完成度数字，给出修正后的评估

### 重写 (Rewritten)

以下文件基于二进制静态分析成果进行了完全重写（非增量修改）：

#### 类型定义 (restored/src/types/)

- **tool.types.ts**
  - 旧版: Anthropic API 层面的 ToolUseBlock / ToolResultBlock 定义
  - 新版: 基于真实内部 Tool 接口的 9 字段定义 (name, call, prompt, inputSchema, isReadOnly, isDestructive, isOpenWorld, isEnabled, validateInput)
  - 新增: ToolRegistry 接口、ToolCallResult、20+ 内置工具名常量

- **hook.types.ts**
  - 旧版: 21 种事件类型 + 通用 HookCallback
  - 新版: 24 种事件类型 + 4 种 Hook 类型 (command / file-watcher / intercept / event)
  - 新增: HookCommandSpec / HookFileWatcherSpec / HookInterceptSpec / HookEventSpec 分类接口
  - 新增: PreToolUse / PostToolUse 拦截器返回值类型

- **permission.types.ts**
  - 旧版: 4 种权限模式 (allow / deny / interactive / sandbox)
  - 新版: 6 种权限模式 (default / auto-allow-readonly / plan / auto-edit / full-auto / bypassPermissions)
  - 新增: 3 种验证分类 (AllowTool / DenyTool / AskUser)
  - 新增: PermissionPolicyEntry / PermissionRuleMatch 接口

- **state.types.ts**
  - 旧版: 简单的 AgentState 枚举 + StateAndCost
  - 新版: ZT 全局状态单例 80+ 字段定义，按功能分区 (session / tool / llm / permission / ui / memory / mcp)
  - 新增: ZTSessionState / ZTToolState / ZTLLMState / ZTPermissionState 等分区接口

- **config.types.ts**
  - 旧版: ConfigScope / ThinkingConfig / ClaudeConfig
  - 新版: 加入 SandboxConfig schema、完整 40+ 环境变量映射表
  - 新增: SandboxNetworkPolicy / SandboxFilesystemPolicy / ConfigLayerStack 接口

#### 核心实现 (restored/src/)

- **core/implementations.ts**
  - 旧版: ymT / vFT / cS 三个函数的推测性实现
  - 新版: 基于真实混淆函数名和 byte-offset 重写的 C8() shell 执行器、yo() 文件读取器、uw_() 原子写入器
  - 每个函数注释中标注了对应的 byte offset 范围和原始混淆函数名

- **session/manager.ts**
  - 旧版: 基于 Map<string, Session> 的内存会话管理
  - 新版: 基于 JSONL 文件持久化 + compact-aware 读取逻辑
  - 新增: JSONL 格式读写、compact boundary 识别、会话恢复

- **memory/manager.ts**
  - 旧版: MEMORY.md 前置元数据解析
  - 新版: 基于 V5 函数的 CLAUDE.md 多级加载 + ~/.claude/memory/ 目录逻辑
  - 新增: 三层指令合并 (global → project → local)、memory 文件 CRUD

- **config/manager.ts**
  - 旧版: 简单的 env → config 映射
  - 新版: 7 层配置优先级栈 + 完整的 40+ 环境变量列表
  - 新增: Policy → Remote → Enterprise → Global → Project → Local → Default 优先级链

- **index.ts**
  - 旧版: 简单的 initializeAgent() → main()
  - 新版: 基于 awO() 入口的真实调用链 (parseArgs → loadConfig → initTools → createAgent → runMainLoop)

### 更新 (Updated)

- **restored/package.json** — 版本号更新至 3.0.0，新增 ink / react / zod / execa 等依赖
- **INDEX.md** — 新增所有重写文件的条目，更新统计信息和快速导航

### 修正 (Fixed)

- **完成度数字矛盾** — 旧版 README 同时声称 "92%"、"99.4%"、"35%"，现统一为：架构 95%、接口 92%、类型还原 75%、核心实现 40%、业务逻辑 15%、综合 ~55%
- **INDEX.md 项目状态** — 旧版声称 "完成度 92%、验证率 95%、可用性 生产可用"，现修正为实际评估

---

## [2.0.0] - 2026-03-26 — 诚实版本

- 初始架构分析项目
- 28 个分析报告
- restored/ 参考实现（基于架构推测编写）
- 诚实的完成度评估：架构 95%, 实现 15%, 综合 ~35%

## [1.0.0] - 2026-03-25 — 初始版本

- 从 Bun 2.1.83 二进制提取 JavaScript bundle
- 初步架构分析
- 首批分析报告
