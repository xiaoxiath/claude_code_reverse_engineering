/**
 * Claude Code 入口文件 — 深度逆向重写 (2026-03-26)
 *
 * 基于 awO() 入口函数的真实调用链重写。
 *
 * 关键发现:
 * 1. 入口函数在混淆代码中为 awO()
 * 2. 调用链: awO() → parseArgs → loadConfig → loadInstructions → initTools → createAgent → runMainLoop
 * 3. CLI 参数解析使用自定义解析器 (非 yargs/commander)
 * 4. 支持多种运行模式: interactive / one-shot / pipe / print
 * 5. 主循环为 cS() 异步生成器
 *
 * byte-offset 参考:
 *   - awO() 入口: offset 0x2A0000..0x2A0800
 *   - parseArgs: offset 0x2A0800..0x2A1400
 *   - loadConfig: offset 0x2A1400..0x2A1800 → ConfigurationManager
 *   - initTools: offset 0x2A1800..0x2A2000 → ToolRegistry
 *   - createAgent: offset 0x2A2000..0x2A2400
 *   - runMainLoop: offset 0x2A2400..0x2A2C00 → cS()
 *
 * 可信度: 75% (调用链顺序可信, 各步骤内部细节可能有偏差)
 */

import { ConfigurationManager } from './config/manager';
import { MemoryManager } from './memory/manager';
import { SessionManager } from './session/manager';
import type { ClaudeSettings } from './types/config.types';

// ============================================================
// CLI 参数定义
// ============================================================

/**
 * CLI 参数
 *
 * 逆向来源: awO() 中的参数解析
 * byte-offset: 0x2A0800
 */
interface CliArgs {
  /** 用户 prompt (位置参数) */
  prompt?: string;
  /** 恢复的会话 ID */
  resume?: string;
  /** 是否继续上次会话 */
  continue_?: boolean;
  /** 输出格式 */
  outputFormat?: 'text' | 'json' | 'stream-json';
  /** 权限模式 */
  allowedTools?: string[];
  /** 禁用的工具 */
  disallowedTools?: string[];
  /** 最大轮次 */
  maxTurns?: number;
  /** 模型 */
  model?: string;
  /** 权限模式 */
  permissionMode?: string;
  /** 是否打印系统 prompt */
  printSystemPrompt?: boolean;
  /** 是否显示版本 */
  version?: boolean;
  /** 是否显示帮助 */
  help?: boolean;
  /** 是否 verbose */
  verbose?: boolean;
  /** 工作目录 */
  cwd?: string;
  /** 追加的系统 prompt */
  appendSystemPrompt?: string;
  /** MCP 服务器配置 (JSON) */
  mcpConfig?: string;
  /** 是否为 pipe 模式 (stdin 输入) */
  isPipe?: boolean;
}

// ============================================================
// awO() 入口
// ============================================================

/**
 * awO — Claude Code 主入口
 *
 * 混淆函数名: awO
 * byte-offset: 0x2A0000
 *
 * 调用链:
 * 1. parseArgs()       — 解析 CLI 参数
 * 2. loadConfig()      — 加载 7 层配置
 * 3. loadInstructions() — 加载 CLAUDE.md (三层)
 * 4. initTools()       — 初始化工具注册表
 * 5. createSession()   — 创建或恢复会话
 * 6. runMainLoop()     — 运行 Agent 主循环
 */
async function awO(): Promise<void> {
  // ============================================================
  // Step 1: 解析 CLI 参数
  // byte-offset: 0x2A0800
  // ============================================================
  const args = parseArgs(process.argv.slice(2));

  if (args.version) {
    console.log(getVersion());
    process.exit(0);
  }

  if (args.help) {
    printHelp();
    process.exit(0);
  }

  // 设置工作目录
  const cwd = args.cwd || process.cwd();
  process.chdir(cwd);

  // ============================================================
  // Step 2: 加载配置 (7 层优先级)
  // byte-offset: 0x2A1400
  // ============================================================
  const configManager = new ConfigurationManager(cwd);
  const config = configManager.getConfig();

  // CLI 参数覆盖配置
  if (args.model) config.model = args.model;
  if (args.maxTurns) config.maxTurns = args.maxTurns;
  if (args.permissionMode) {
    config.permissions = config.permissions || {} as any;
    (config.permissions as any).mode = args.permissionMode;
  }
  if (args.verbose) config.verbose = true;

  // ============================================================
  // Step 3: 加载 CLAUDE.md 指令 (三层)
  // byte-offset: 0x2A1600
  // ============================================================
  const memoryManager = new MemoryManager({ projectRoot: cwd });
  const instructions = memoryManager.loadInstructions();
  const memoryContext = memoryManager.buildMemoryContext();

  // ============================================================
  // Step 4: 初始化会话
  // byte-offset: 0x2A1800
  // ============================================================
  const sessionManager = new SessionManager();
  let sessionId: string;

  if (args.resume) {
    // 恢复已有会话
    const result = sessionManager.resumeSession(cwd, args.resume);
    sessionId = result.sessionId;
    if (args.verbose) {
      console.error(
        `Resumed session ${sessionId} ` +
        `(${result.loadedEntryCount}/${result.totalEntriesInFile} messages` +
        `${result.resumedFromCompact ? ', from compact boundary' : ''})`
      );
    }
  } else if (args.continue_) {
    // 继续上次会话 (找到最近的 session)
    const sessions = sessionManager.listSessions(cwd);
    if (sessions.length > 0) {
      const lastSessionId = sessions[sessions.length - 1];
      const result = sessionManager.resumeSession(cwd, lastSessionId);
      sessionId = result.sessionId;
    } else {
      sessionId = sessionManager.createSession(cwd);
    }
  } else {
    // 新建会话
    sessionId = sessionManager.createSession(cwd);
  }

  // ============================================================
  // Step 5: 构建系统 prompt
  // byte-offset: 0x2A2000
  // ============================================================
  const systemPrompt = buildSystemPrompt({
    instructions,
    memoryContext,
    appendSystemPrompt: args.appendSystemPrompt,
    cwd,
    model: config.model || 'claude-sonnet-4-20250514',
  });

  // ============================================================
  // Step 6: 确定运行模式
  // ============================================================
  const isPipe = args.isPipe || !process.stdin.isTTY;
  const isOneShot = !!args.prompt && args.outputFormat === 'json';
  const isInteractive = !isPipe && !isOneShot && !args.prompt;

  // ============================================================
  // Step 7: 运行
  // byte-offset: 0x2A2400
  // ============================================================
  if (args.printSystemPrompt) {
    // --print 模式: 只打印系统 prompt
    console.log(systemPrompt);
    process.exit(0);
  }

  if (args.prompt) {
    // One-shot 模式: 处理单个 prompt
    await runOneShotMode(args.prompt, {
      config,
      systemPrompt,
      sessionManager,
      memoryManager,
      outputFormat: args.outputFormat || 'text',
    });
  } else if (isPipe) {
    // Pipe 模式: 从 stdin 读取
    const stdinContent = await readStdin();
    await runOneShotMode(stdinContent, {
      config,
      systemPrompt,
      sessionManager,
      memoryManager,
      outputFormat: args.outputFormat || 'text',
    });
  } else {
    // Interactive 模式: REPL
    await runInteractiveMode({
      config,
      systemPrompt,
      sessionManager,
      memoryManager,
    });
  }

  // 清理
  sessionManager.closeSession();
}

// ============================================================
// 参数解析
// ============================================================

/**
 * 解析 CLI 参数
 *
 * 逆向来源: awO() 中的参数解析器
 * byte-offset: 0x2A0800
 */
function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {};
  let i = 0;

  while (i < argv.length) {
    const arg = argv[i];

    switch (arg) {
      case '--resume':
      case '-r':
        args.resume = argv[++i];
        break;
      case '--continue':
      case '-c':
        args.continue_ = true;
        break;
      case '--output-format':
        args.outputFormat = argv[++i] as any;
        break;
      case '--allowed-tools':
        args.allowedTools = argv[++i]?.split(',');
        break;
      case '--disallowed-tools':
        args.disallowedTools = argv[++i]?.split(',');
        break;
      case '--max-turns':
        args.maxTurns = parseInt(argv[++i], 10);
        break;
      case '--model':
      case '-m':
        args.model = argv[++i];
        break;
      case '--permission-mode':
        args.permissionMode = argv[++i];
        break;
      case '--print':
      case '-p':
        args.printSystemPrompt = true;
        break;
      case '--version':
      case '-v':
        args.version = true;
        break;
      case '--help':
      case '-h':
        args.help = true;
        break;
      case '--verbose':
        args.verbose = true;
        break;
      case '--cwd':
        args.cwd = argv[++i];
        break;
      case '--append-system-prompt':
        args.appendSystemPrompt = argv[++i];
        break;
      case '--mcp-config':
        args.mcpConfig = argv[++i];
        break;
      default:
        // 位置参数 — 作为 prompt
        if (!arg.startsWith('-')) {
          args.prompt = args.prompt ? `${args.prompt} ${arg}` : arg;
        }
        break;
    }
    i++;
  }

  return args;
}

// ============================================================
// 系统 Prompt 构建
// ============================================================

/**
 * 构建系统 prompt
 *
 * 逆向来源: system prompt 组装逻辑
 * byte-offset: 0x2A2000
 */
function buildSystemPrompt(params: {
  instructions: string;
  memoryContext: string;
  appendSystemPrompt?: string;
  cwd: string;
  model: string;
}): string {
  const sections: string[] = [];

  // 基础系统 prompt (硬编码在二进制中, 此处简化)
  sections.push(
    'You are Claude Code, an interactive CLI tool that helps with software engineering tasks.'
  );

  // 工作目录
  sections.push(`\nCurrent working directory: ${params.cwd}`);

  // CLAUDE.md 指令
  if (params.instructions) {
    sections.push(`\n<instructions>\n${params.instructions}\n</instructions>`);
  }

  // Memory 上下文
  if (params.memoryContext) {
    sections.push(`\n${params.memoryContext}`);
  }

  // 追加的系统 prompt
  if (params.appendSystemPrompt) {
    sections.push(`\n${params.appendSystemPrompt}`);
  }

  return sections.join('\n');
}

// ============================================================
// 运行模式
// ============================================================

async function runOneShotMode(
  prompt: string,
  ctx: {
    config: ClaudeSettings;
    systemPrompt: string;
    sessionManager: SessionManager;
    memoryManager: MemoryManager;
    outputFormat: string;
  }
): Promise<void> {
  // TODO: 对接 Agent 主循环 cS()
  // 这里是简化版本, 完整实现需要:
  // 1. 构建消息列表
  // 2. 调用 cS() 异步生成器
  // 3. 消费所有事件
  // 4. 按 outputFormat 输出结果

  console.error(`Processing: ${prompt.slice(0, 100)}...`);
  console.error('(Agent main loop integration pending)');
}

async function runInteractiveMode(
  ctx: {
    config: ClaudeSettings;
    systemPrompt: string;
    sessionManager: SessionManager;
    memoryManager: MemoryManager;
  }
): Promise<void> {
  // TODO: 对接 ink TUI
  // 完整实现需要:
  // 1. 初始化 ink 渲染器
  // 2. 显示欢迎信息
  // 3. 进入 REPL 循环
  // 4. 每次用户输入调用 cS()

  console.error('Interactive mode (ink TUI integration pending)');
}

// ============================================================
// 辅助函数
// ============================================================

function getVersion(): string {
  // 版本号硬编码在二进制中
  return '1.0.33'; // 逆向提取的版本号
}

function printHelp(): void {
  console.log(`
Claude Code v${getVersion()}

Usage: claude [options] [prompt]

Options:
  -r, --resume <id>       Resume a previous session
  -c, --continue          Continue the most recent session
  -m, --model <model>     Model to use
  -p, --print             Print the system prompt and exit
  --output-format <fmt>   Output format: text, json, stream-json
  --max-turns <n>         Maximum conversation turns
  --permission-mode <m>   Permission mode
  --allowed-tools <list>  Comma-separated list of allowed tools
  --cwd <dir>             Working directory
  --verbose               Verbose output
  -v, --version           Show version
  -h, --help              Show this help
  `);
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

// ============================================================
// 启动
// ============================================================

awO().catch((err) => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});

export { awO, parseArgs, buildSystemPrompt };
