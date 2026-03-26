// ============================================
// Tool Registry - 工具注册中心
// ============================================

import type { Tool, ToolDefinition } from '../types';

/**
 * 工具注册表
 * 单例模式
 */
export class ToolRegistry {
  private static instance: ToolRegistry;
  private tools: Map<string, Tool> = new Map();

  private constructor() {}

  /**
   * 获取单例实例
   */
  static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }

  /**
   * 注册工具
   */
  register(tool: Tool): void {
    if (this.tools.has(tool.name)) {
      console.warn(`Tool ${tool.name} is already registered, overwriting`);
    }
    this.tools.set(tool.name, tool);
  }

  /**
   * 批量注册工具
   */
  registerAll(tools: Tool[]): void {
    tools.forEach(tool => this.register(tool));
  }

  /**
   * 获取工具
   */
  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * 检查工具是否存在
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * 获取所有工具
   */
  getAll(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * 获取所有工具定义 (用于 LLM API)
   */
  getToolDefinitions(): ToolDefinition[] {
    return this.getAll().map(tool => ({
      name: tool.name,
      description: tool.description,
      input_schema: tool.input_schema
    }));
  }

  /**
   * 获取工具描述列表
   */
  getToolDescriptions(): string {
    return this.getAll()
      .map(tool => `- ${tool.name}: ${tool.description}`)
      .join('\n');
  }

  /**
   * 注销工具
   */
  unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  /**
   * 清空所有工具
   */
  clear(): void {
    this.tools.clear();
  }
}

// ============================================
// Tool Executor - 工具执行器
// ============================================

import { z } from 'zod';
import { ToolExecutionError, ValidationError } from '../types';

export class ToolExecutor {
  private registry: ToolRegistry;

  constructor() {
    this.registry = ToolRegistry.getInstance();
  }

  /**
   * 执行工具
   */
  async execute(toolName: string, params: any): Promise<any> {
    // 1. 查找工具
    const tool = this.registry.get(toolName);

    if (!tool) {
      throw new ToolExecutionError(
        toolName,
        `Unknown tool: ${toolName}`
      );
    }

    // 2. 验证参数
    this.validateParams(tool, params);

    // 3. 执行工具
    try {
      const startTime = Date.now();
      const result = await tool.execute(params);
      const duration = Date.now() - startTime;

      console.log(`[Tool] ${toolName} executed in ${duration}ms`);

      return result;

    } catch (error: any) {
      throw new ToolExecutionError(
        toolName,
        error.message || 'Unknown error'
      );
    }
  }

  /**
   * 验证参数
   */
  private validateParams(tool: Tool, params: any): void {
    try {
      // 使用 Zod schema 验证
      const schema = tool.input_schema as any;

      if (schema && schema.parse) {
        schema.parse(params);
      }
    } catch (error: any) {
      throw new ValidationError(
        `Invalid parameters for ${tool.name}: ${error.message}`
      );
    }
  }

  /**
   * 获取工具定义
   */
  getToolDefinitions(): ToolDefinition[] {
    return this.registry.getToolDefinitions();
  }

  /**
   * 获取工具描述
   */
  getToolDescriptions(): string {
    return this.registry.getToolDescriptions();
  }
}

// ============================================
// Base Tool - 工具基类
// ============================================

export abstract class BaseTool implements Tool {
  abstract name: string;
  abstract description: string;
  abstract input_schema: any;

  abstract execute(params: any): Promise<any>;

  /**
   * 验证文件路径安全性
   */
  protected validateFilePath(filePath: string): void {
    // 防止路径遍历攻击
    if (filePath.includes('..')) {
      throw new Error('Path traversal detected');
    }

    // 检查绝对路径
    if (!filePath.startsWith('/')) {
      throw new Error('Absolute path required');
    }
  }

  /**
   * 解析相对路径为绝对路径
   */
  protected resolvePath(relativePath: string): string {
    if (relativePath.startsWith('/')) {
      return relativePath;
    }

    return require('path').resolve(process.cwd(), relativePath);
  }
}
