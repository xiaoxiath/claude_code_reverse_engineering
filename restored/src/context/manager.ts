/**
 * Context Manager - Advanced Context Management
 *
 * Restored from Bun 2.1.83 binary
 * Unified management of all context sources with intelligent prioritization
 */

import { EventEmitter } from 'events';
import { SessionManager } from '../session/manager';
import { MemoryManager } from '../memory/manager';
import { ConfigurationManager } from '../config/manager';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';

// ============================================
// Type Definitions
// ============================================

export type ContextPriority = 'critical' | 'high' | 'medium' | 'low';
export type ContextSource = 'system' | 'project' | 'memory' | 'session' | 'tool';

export interface ContextBlock {
  id: string;
  source: ContextSource;
  priority: ContextPriority;
  content: string;
  tokens: number;
  timestamp: number;
  metadata?: Record<string, any>;
  dependencies?: string[];
  expires?: number;
}

export interface ContextWindow {
  maxTokens: number;
  reservedTokens: number;
  availableTokens: number;
  usedTokens: number;
  blocks: ContextBlock[];
}

export interface ContextCompressionResult {
  originalTokens: number;
  compressedTokens: number;
  compressionRatio: number;
  removedBlocks: string[];
  mergedBlocks: string[];
}

export interface ContextConfig {
  maxContextTokens: number;
  reservedForResponse: number;
  compressionThreshold: number;
  prioritizationStrategy: 'fifo' | 'lru' | 'priority' | 'hybrid';
  enableCaching: boolean;
  cacheTTL: number;
}

// ============================================
// Context Manager Implementation
// ============================================

export class ContextManager extends EventEmitter {
  private config: ContextConfig;
  private sessionManager: SessionManager;
  private memoryManager: MemoryManager;
  private configManager: ConfigurationManager;

  private contextBlocks: Map<string, ContextBlock> = new Map();
  private blockOrder: string[] = [];
  private tokenCounter: (text: string) => number;
  private cache: Map<string, { content: string; timestamp: number }> = new Map();

  constructor(
    sessionManager: SessionManager,
    memoryManager: MemoryManager,
    configManager: ConfigurationManager,
    config: Partial<ContextConfig> = {}
  ) {
    super();

    this.sessionManager = sessionManager;
    this.memoryManager = memoryManager;
    this.configManager = configManager;

    this.config = {
      maxContextTokens: 100000,
      reservedForResponse: 8192,
      compressionThreshold: 0.85,
      prioritizationStrategy: 'hybrid',
      enableCaching: true,
      cacheTTL: 60000, // 1 minute
      ...config,
    };

    this.tokenCounter = (text: string) => Math.ceil(text.length / 4);
  }

  // ============================================
  // Context Block Management
  // ============================================

  /**
   * Add a context block
   */
  addContextBlock(block: Omit<ContextBlock, 'id' | 'tokens' | 'timestamp'>): string {
    const id = this.generateBlockId();
    const tokens = this.tokenCounter(block.content);

    const contextBlock: ContextBlock = {
      ...block,
      id,
      tokens,
      timestamp: Date.now(),
    };

    this.contextBlocks.set(id, contextBlock);
    this.blockOrder.push(id);

    // Check if compression needed
    const window = this.getContextWindow();

    if (window.usedTokens > window.maxTokens * this.config.compressionThreshold) {
      this.compressContext();
    }

    this.emit('block_added', contextBlock);

    return id;
  }

  /**
   * Update context block
   */
  updateContextBlock(id: string, updates: Partial<ContextBlock>): boolean {
    const block = this.contextBlocks.get(id);

    if (!block) {
      return false;
    }

    const updated: ContextBlock = {
      ...block,
      ...updates,
      tokens: updates.content ? this.tokenCounter(updates.content) : block.tokens,
    };

    this.contextBlocks.set(id, updated);

    this.emit('block_updated', { old: block, new: updated });

    return true;
  }

  /**
   * Remove context block
   */
  removeContextBlock(id: string): boolean {
    const block = this.contextBlocks.get(id);

    if (!block) {
      return false;
    }

    this.contextBlocks.delete(id);
    this.blockOrder = this.blockOrder.filter(bid => bid !== id);

    this.emit('block_removed', block);

    return true;
  }

  /**
   * Get context block
   */
  getContextBlock(id: string): ContextBlock | null {
    return this.contextBlocks.get(id) || null;
  }

  /**
   * Get all context blocks
   */
  getAllContextBlocks(): ContextBlock[] {
    return this.blockOrder.map(id => this.contextBlocks.get(id)).filter(Boolean) as ContextBlock[];
  }

  // ============================================
  // Context Building
  // ============================================

  /**
   * Build complete context for LLM
   */
  buildContext(): string {
    const sections: string[] = [];

    // 1. System context (highest priority)
    const systemContext = this.buildSystemContext();
    if (systemContext) {
      sections.push(systemContext);
    }

    // 2. Project context
    const projectContext = this.buildProjectContext();
    if (projectContext) {
      sections.push(projectContext);
    }

    // 3. Memory context
    const memoryContext = this.buildMemoryContext();
    if (memoryContext) {
      sections.push(memoryContext);
    }

    // 4. Session context (conversation history)
    const sessionContext = this.buildSessionContext();
    if (sessionContext) {
      sections.push(sessionContext);
    }

    // 5. Tool context
    const toolContext = this.buildToolContext();
    if (toolContext) {
      sections.push(toolContext);
    }

    // 6. Custom context blocks (sorted by priority)
    const customContext = this.buildCustomContext();
    if (customContext) {
      sections.push(customContext);
    }

    return sections.join('\n\n---\n\n');
  }

  /**
   * Build system context
   */
  private buildSystemContext(): string {
    return `# System Context

You are Claude Code, Anthropic's official CLI for Claude.

## Capabilities

- Read, write, and edit files
- Execute bash commands
- Search code with grep and glob
- Understand project structure
- Maintain conversation history
- Learn from feedback

## Behavior

- Always ask for permission before executing potentially dangerous operations
- Provide clear explanations of your actions
- Follow coding best practices
- Respect project conventions
- Use memory to persist important information`;
  }

  /**
   * Build project context
   */
  private buildProjectContext(): string {
    const projectContext = this.configManager.getProjectContext();

    if (!projectContext) {
      return '';
    }

    const sections: string[] = ['# Project Context'];

    if (projectContext.description) {
      sections.push(projectContext.description);
    }

    if (projectContext.instructions && projectContext.instructions.length > 0) {
      sections.push('\n## Instructions');
      projectContext.instructions.forEach(inst => {
        sections.push(`- ${inst}`);
      });
    }

    if (projectContext.conventions && projectContext.conventions.length > 0) {
      sections.push('\n## Coding Conventions');
      projectContext.conventions.forEach(conv => {
        sections.push(`- ${conv}`);
      });
    }

    if (projectContext.dependencies && projectContext.dependencies.length > 0) {
      sections.push('\n## Dependencies');
      projectContext.dependencies.forEach(dep => {
        sections.push(`- ${dep}`);
      });
    }

    return sections.join('\n');
  }

  /**
   * Build memory context
   */
  private buildMemoryContext(): string {
    return this.memoryManager.buildContext();
  }

  /**
   * Build session context (conversation history)
   */
  private buildSessionContext(): string {
    const messages = this.sessionManager.getMessages();

    if (messages.length === 0) {
      return '';
    }

    // Get recent messages (last N messages)
    const recentMessages = messages.slice(-20);

    const sections: string[] = ['# Recent Conversation'];

    for (const message of recentMessages) {
      const role = message.role.toUpperCase();

      if (typeof message.content === 'string') {
        sections.push(`\n**${role}:**\n${message.content}`);
      } else if (Array.isArray(message.content)) {
        const textBlocks = message.content.filter((b: any) => b.type === 'text');
        const text = textBlocks.map((b: any) => b.text).join('\n');

        if (text) {
          sections.push(`\n**${role}:**\n${text}`);
        }

        // Include tool use information
        const toolBlocks = message.content.filter((b: any) => b.type === 'tool_use');
        if (toolBlocks.length > 0) {
          sections.push(`\n**${role} used tools:**`);
          toolBlocks.forEach((b: any) => {
            sections.push(`- ${b.name}`);
          });
        }
      }
    }

    return sections.join('\n');
  }

  /**
   * Build tool context
   */
  private buildToolContext(): string {
    return `# Available Tools

- **Read**: Read file contents
- **Write**: Write to files
- **Edit**: Edit file contents
- **Bash**: Execute bash commands
- **Glob**: Find files by pattern
- **Grep**: Search file contents`;
  }

  /**
   * Build custom context blocks
   */
  private buildCustomContext(): string {
    const blocks = this.getAllContextBlocks();

    if (blocks.length === 0) {
      return '';
    }

    // Sort by priority
    const priorityOrder: ContextPriority[] = ['critical', 'high', 'medium', 'low'];
    const sortedBlocks = blocks.sort((a, b) => {
      return priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority);
    });

    const sections: string[] = ['# Additional Context'];

    for (const block of sortedBlocks) {
      sections.push(`\n## ${block.source}: ${block.id}`);
      sections.push(block.content);

      if (block.metadata) {
        sections.push(`\n*Metadata: ${JSON.stringify(block.metadata)}*`);
      }
    }

    return sections.join('\n');
  }

  // ============================================
  // Context Window Management
  // ============================================

  /**
   * Get current context window status
   */
  getContextWindow(): ContextWindow {
    let usedTokens = 0;

    for (const block of this.contextBlocks.values()) {
      usedTokens += block.tokens;
    }

    // Add session tokens
    const sessionMessages = this.sessionManager.getMessages();
    for (const message of sessionMessages) {
      if (typeof message.content === 'string') {
        usedTokens += this.tokenCounter(message.content);
      } else if (Array.isArray(message.content)) {
        for (const block of message.content as any[]) {
          if (block.type === 'text') {
            usedTokens += this.tokenCounter(block.text);
          }
        }
      }
    }

    return {
      maxTokens: this.config.maxContextTokens,
      reservedTokens: this.config.reservedForResponse,
      availableTokens: this.config.maxContextTokens - this.config.reservedForResponse,
      usedTokens,
      blocks: this.getAllContextBlocks(),
    };
  }

  /**
   * Check if context window has space
   */
  hasSpace(tokens: number): boolean {
    const window = this.getContextWindow();
    return window.usedTokens + tokens <= window.availableTokens;
  }

  /**
   * Get available space in context window
   */
  getAvailableSpace(): number {
    const window = this.getContextWindow();
    return Math.max(0, window.availableTokens - window.usedTokens);
  }

  // ============================================
  // Context Compression
  // ============================================

  /**
   * Compress context to fit within window
   */
  compressContext(): ContextCompressionResult {
    const originalTokens = this.getContextWindow().usedTokens;
    const removedBlocks: string[] = [];
    const mergedBlocks: string[] = [];

    // Strategy 1: Remove expired blocks
    this.removeExpiredBlocks(removedBlocks);

    // Strategy 2: Remove low priority blocks
    this.removeLowPriorityBlocks(removedBlocks);

    // Strategy 3: Merge similar blocks
    this.mergeSimilarBlocks(mergedBlocks);

    // Strategy 4: Compress session history
    this.compressSessionHistory();

    const compressedTokens = this.getContextWindow().usedTokens;

    const result: ContextCompressionResult = {
      originalTokens,
      compressedTokens,
      compressionRatio: compressedTokens / originalTokens,
      removedBlocks,
      mergedBlocks,
    };

    this.emit('context_compressed', result);

    return result;
  }

  /**
   * Remove expired blocks
   */
  private removeExpiredBlocks(removed: string[]): void {
    const now = Date.now();

    for (const [id, block] of this.contextBlocks) {
      if (block.expires && block.expires < now) {
        this.removeContextBlock(id);
        removed.push(id);
      }
    }
  }

  /**
   * Remove low priority blocks
   */
  private removeLowPriorityBlocks(removed: string[]): void {
    const window = this.getContextWindow();

    if (window.usedTokens <= window.availableTokens) {
      return;
    }

    // Remove blocks in order: low -> medium -> high
    const priorityOrder: ContextPriority[] = ['low', 'medium', 'high'];

    for (const priority of priorityOrder) {
      for (const [id, block] of this.contextBlocks) {
        if (block.priority === priority && block.priority !== 'critical') {
          this.removeContextBlock(id);
          removed.push(id);

          if (this.getContextWindow().usedTokens <= this.getContextWindow().availableTokens) {
            return;
          }
        }
      }
    }
  }

  /**
   * Merge similar blocks
   */
  private mergeSimilarBlocks(merged: string[]): void {
    // Group blocks by source
    const bySource: Map<ContextSource, ContextBlock[]> = new Map();

    for (const block of this.contextBlocks.values()) {
      if (!bySource.has(block.source)) {
        bySource.set(block.source, []);
      }
      bySource.get(block.source)!.push(block);
    }

    // Merge blocks of same source with same priority
    for (const [source, blocks] of bySource) {
      const byPriority: Map<ContextPriority, ContextBlock[]> = new Map();

      for (const block of blocks) {
        if (!byPriority.has(block.priority)) {
          byPriority.set(block.priority, []);
        }
        byPriority.get(block.priority)!.push(block);
      }

      for (const [priority, priorityBlocks] of byPriority) {
        if (priorityBlocks.length > 3) {
          // Merge all blocks of this source and priority
          const mergedContent = priorityBlocks.map(b => b.content).join('\n\n');
          const mergedBlock: ContextBlock = {
            id: this.generateBlockId(),
            source,
            priority,
            content: mergedContent,
            tokens: this.tokenCounter(mergedContent),
            timestamp: Date.now(),
            metadata: {
              mergedFrom: priorityBlocks.map(b => b.id),
            },
          };

          // Remove old blocks
          for (const block of priorityBlocks) {
            this.contextBlocks.delete(block.id);
            merged.push(block.id);
          }

          // Add merged block
          this.contextBlocks.set(mergedBlock.id, mergedBlock);
          this.blockOrder.push(mergedBlock.id);
        }
      }
    }
  }

  /**
   * Compress session history
   */
  private compressSessionHistory(): void {
    const session = this.sessionManager.getCurrentSession();

    if (session) {
      this.sessionManager.compressSession(session);
    }
  }

  // ============================================
  // Context Prioritization
  // ============================================

  /**
   * Prioritize context blocks
   */
  prioritizeContext(): ContextBlock[] {
    const blocks = this.getAllContextBlocks();

    switch (this.config.prioritizationStrategy) {
      case 'fifo':
        return blocks; // Already in FIFO order

      case 'lru':
        return blocks.sort((a, b) => b.timestamp - a.timestamp);

      case 'priority':
        const priorityOrder: ContextPriority[] = ['critical', 'high', 'medium', 'low'];
        return blocks.sort((a, b) => {
          return priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority);
        });

      case 'hybrid':
        return this.hybridPrioritize(blocks);

      default:
        return blocks;
    }
  }

  /**
   * Hybrid prioritization algorithm
   */
  private hybridPrioritize(blocks: ContextBlock[]): ContextBlock[] {
    const now = Date.now();

    return blocks.sort((a, b) => {
      // Priority score (0-100)
      const priorityWeights: Record<ContextPriority, number> = {
        critical: 100,
        high: 75,
        medium: 50,
        low: 25,
      };

      const priorityA = priorityWeights[a.priority];
      const priorityB = priorityWeights[b.priority];

      // Recency score (0-20)
      const ageA = (now - a.timestamp) / 1000 / 60; // minutes
      const ageB = (now - b.timestamp) / 1000 / 60;
      const recencyA = Math.max(0, 20 - ageA);
      const recencyB = Math.max(0, 20 - ageB);

      // Size score (0-10, smaller is better)
      const sizeA = Math.min(10, a.tokens / 100);
      const sizeB = Math.min(10, b.tokens / 100);

      // Total score
      const scoreA = priorityA + recencyA - sizeA;
      const scoreB = priorityB + recencyB - sizeB;

      return scoreB - scoreA;
    });
  }

  // ============================================
  // Caching
  // ============================================

  /**
   * Get cached context
   */
  getCachedContext(key: string): string | null {
    if (!this.config.enableCaching) {
      return null;
    }

    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    // Check TTL
    if (Date.now() - cached.timestamp > this.config.cacheTTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.content;
  }

  /**
   * Cache context
   */
  cacheContext(key: string, content: string): void {
    if (!this.config.enableCaching) {
      return;
    }

    this.cache.set(key, {
      content,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    this.emit('cache_cleared');
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Generate unique block ID
   */
  private generateBlockId(): string {
    return `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Set token counter
   */
  setTokenCounter(counter: (text: string) => number): void {
    this.tokenCounter = counter;
  }

  /**
   * Get context statistics
   */
  getStats(): {
    totalBlocks: number;
    totalTokens: number;
    bySource: Record<ContextSource, number>;
    byPriority: Record<ContextPriority, number>;
    cacheSize: number;
  } {
    const bySource: Record<ContextSource, number> = {
      system: 0,
      project: 0,
      memory: 0,
      session: 0,
      tool: 0,
    };

    const byPriority: Record<ContextPriority, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    let totalTokens = 0;

    for (const block of this.contextBlocks.values()) {
      bySource[block.source]++;
      byPriority[block.priority]++;
      totalTokens += block.tokens;
    }

    return {
      totalBlocks: this.contextBlocks.size,
      totalTokens,
      bySource,
      byPriority,
      cacheSize: this.cache.size,
    };
  }

  /**
   * Clear all context
   */
  clearContext(): void {
    this.contextBlocks.clear();
    this.blockOrder = [];
    this.clearCache();
    this.emit('context_cleared');
  }

  /**
   * Export context
   */
  exportContext(): string {
    const data = {
      blocks: this.getAllContextBlocks(),
      config: this.config,
      exportedAt: Date.now(),
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Import context
   */
  importContext(data: string): number {
    const parsed = JSON.parse(data);
    let imported = 0;

    for (const block of parsed.blocks) {
      this.contextBlocks.set(block.id, block);
      this.blockOrder.push(block.id);
      imported++;
    }

    this.emit('context_imported', { count: imported });

    return imported;
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Create context manager
 */
export function createContextManager(
  sessionManager: SessionManager,
  memoryManager: MemoryManager,
  configManager: ConfigurationManager,
  config: Partial<ContextConfig> = {}
): ContextManager {
  return new ContextManager(sessionManager, memoryManager, configManager, config);
}
