// ============================================
// Claude Code - 主入口
// ============================================

import { Agent } from './agent/Agent';
import { ToolRegistry } from './tools/registry';
import {
  ReadTool,
  WriteTool,
  EditTool,
  BashTool,
  GlobTool,
  GrepTool
} from './tools/implementations';
import type { AgentConfig } from './types';

/**
 * 初始化 Agent
 */
async function initializeAgent(): Promise<Agent> {
  // 1. 创建配置
  const config: AgentConfig = {
    llm: {
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: 'claude-sonnet-4.6',
      maxTokens: 8192
    },
    permissions: {
      mode: process.env.PERMISSION_MODE as any || 'interactive'
    },
    debug: process.env.DEBUG === 'true'
  };

  // 2. 创建 Agent
  const agent = new Agent(config);

  // 3. 注册工具
  const toolRegistry = ToolRegistry.getInstance();
  toolRegistry.registerAll([
    new ReadTool(),
    new WriteTool(),
    new EditTool(),
    new BashTool(),
    new GlobTool(),
    new GrepTool()
    // TODO: 添加更多工具
  ]);

  return agent;
}

/**
 * 主函数
 */
async function main() {
  console.log('🚀 Claude Code is starting...\n');

  try {
    // 初始化
    const agent = await initializeAgent();

    // 获取用户输入
    const userInput = process.argv.slice(2).join(' ');

    if (!userInput) {
      console.log('Usage: claude-code <your question>');
      process.exit(1);
    }

    // 处理用户输入
    const response = await agent.processUserInput(userInput);

    console.log('\n✅ Done!\n');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// 启动
main();

export { Agent, initializeAgent };
