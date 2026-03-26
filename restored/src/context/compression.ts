/**
 * Context Compression Strategies
 *
 * Advanced compression algorithms for context management
 */

import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';

// ============================================
// Type Definitions
// ============================================

export interface CompressionStrategy {
  name: string;
  description: string;
  compress(messages: MessageParam[], options?: CompressionOptions): MessageParam[];
}

export interface CompressionOptions {
  maxTokens: number;
  preserveSystem: boolean;
  preserveRecent: number;
  summarizationDepth: 'brief' | 'detailed' | 'comprehensive';
}

export interface MessageSummary {
  role: 'user' | 'assistant';
  summary: string;
  originalTokens: number;
  compressedTokens: number;
  keyPoints: string[];
  toolUses?: string[];
}

// ============================================
// Sliding Window Strategy
// ============================================

export class SlidingWindowStrategy implements CompressionStrategy {
  name = 'sliding_window';
  description = 'Keep recent N messages, summarize older ones';

  compress(messages: MessageParam[], options?: CompressionOptions): MessageParam[] {
    const preserveRecent = options?.preserveRecent || 5;
    const preserveSystem = options?.preserveSystem !== false;

    if (messages.length <= preserveRecent) {
      return messages;
    }

    const result: MessageParam[] = [];

    // Preserve system message if present
    if (preserveSystem && messages[0]?.role === 'user') {
      const firstMsg = messages[0];
      if (typeof firstMsg.content === 'string' && firstMsg.content.includes('system')) {
        result.push(firstMsg);
      }
    }

    // Summarize old messages
    const oldMessages = messages.slice(0, -preserveRecent);
    if (oldMessages.length > 0) {
      const summary = this.summarizeMessages(oldMessages);
      result.push({
        role: 'user',
        content: `[Context Summary]\n${summary}`,
      });
    }

    // Keep recent messages
    const recentMessages = messages.slice(-preserveRecent);
    result.push(...recentMessages);

    return result;
  }

  private summarizeMessages(messages: MessageParam[]): string {
    const points: string[] = [];
    let userCount = 0;
    let assistantCount = 0;
    const toolsUsed = new Set<string>();

    for (const msg of messages) {
      if (msg.role === 'user') {
        userCount++;
      } else {
        assistantCount++;
      }

      if (Array.isArray(msg.content)) {
        for (const block of msg.content as any[]) {
          if (block.type === 'tool_use') {
            toolsUsed.add(block.name);
          }
        }
      }
    }

    points.push(`- Conversation had ${userCount} user messages and ${assistantCount} assistant messages`);

    if (toolsUsed.size > 0) {
      points.push(`- Tools used: ${Array.from(toolsUsed).join(', ')}`);
    }

    return points.join('\n');
  }
}

// ============================================
// Hierarchical Compression Strategy
// ============================================

export class HierarchicalCompressionStrategy implements CompressionStrategy {
  name = 'hierarchical';
  description = 'Multi-level compression with different granularities';

  compress(messages: MessageParam[], options?: CompressionOptions): MessageParam[] {
    const maxTokens = options?.maxTokens || 10000;

    // Level 1: Keep last N messages fully
    const level1 = messages.slice(-5);

    // Level 2: Compress middle messages moderately
    const level2 = messages.slice(-20, -5);
    const level2Compressed = this.compressLevel(level2, 'moderate');

    // Level 3: Compress old messages heavily
    const level3 = messages.slice(0, -20);
    const level3Compressed = this.compressLevel(level3, 'heavy');

    const result: MessageParam[] = [];

    // Add level 3 (heavily compressed)
    if (level3Compressed.length > 0) {
      result.push({
        role: 'user',
        content: `[Earlier Context]\n${level3Compressed}`,
      });
    }

    // Add level 2 (moderately compressed)
    if (level2Compressed.length > 0) {
      result.push({
        role: 'user',
        content: `[Recent Context]\n${level2Compressed}`,
      });
    }

    // Add level 1 (full messages)
    result.push(...level1);

    return result;
  }

  private compressLevel(messages: MessageParam[], level: 'moderate' | 'heavy'): string {
    if (messages.length === 0) {
      return '';
    }

    const summaries: string[] = [];

    if (level === 'heavy') {
      // Group messages into batches of 10
      for (let i = 0; i < messages.length; i += 10) {
        const batch = messages.slice(i, i + 10);
        const summary = this.summarizeBatch(batch);
        summaries.push(summary);
      }
    } else {
      // Group messages into batches of 5
      for (let i = 0; i < messages.length; i += 5) {
        const batch = messages.slice(i, i + 5);
        const summary = this.summarizeBatch(batch);
        summaries.push(summary);
      }
    }

    return summaries.join('\n\n');
  }

  private summarizeBatch(messages: MessageParam[]): string {
    const points: string[] = [];
    let lastUserMsg = '';
    let lastAssistantMsg = '';

    for (const msg of messages) {
      if (msg.role === 'user') {
        if (typeof msg.content === 'string') {
          lastUserMsg = msg.content.slice(0, 100);
        }
      } else {
        if (typeof msg.content === 'string') {
          lastAssistantMsg = msg.content.slice(0, 100);
        }
      }
    }

    if (lastUserMsg) {
      points.push(`User: ${lastUserMsg}...`);
    }

    if (lastAssistantMsg) {
      points.push(`Assistant: ${lastAssistantMsg}...`);
    }

    return points.join('\n');
  }
}

// ============================================
// Semantic Clustering Strategy
// ============================================

export class SemanticClusteringStrategy implements CompressionStrategy {
  name = 'semantic_clustering';
  description = 'Group related messages and summarize by cluster';

  compress(messages: MessageParam[], options?: CompressionOptions): MessageParam[] {
    // Cluster messages by topic
    const clusters = this.clusterMessages(messages);

    const result: MessageParam[] = [];

    // Summarize each cluster
    for (const cluster of clusters) {
      const summary = this.summarizeCluster(cluster);
      result.push({
        role: 'user',
        content: `[${cluster.topic}]\n${summary}`,
      });
    }

    // Keep recent messages intact
    const recent = messages.slice(-5);
    result.push(...recent);

    return result;
  }

  private clusterMessages(messages: MessageParam[]): Array<{ topic: string; messages: MessageParam[] }> {
    const clusters: Array<{ topic: string; messages: MessageParam[] }> = [];
    let currentCluster: MessageParam[] = [];
    let currentTopic = 'General Discussion';

    // Simple keyword-based clustering
    const topicKeywords: Record<string, string[]> = {
      'File Operations': ['read', 'write', 'edit', 'file', 'path'],
      'Code Analysis': ['analyze', 'review', 'code', 'function', 'class'],
      'Debugging': ['error', 'bug', 'fix', 'debug', 'issue'],
      'Testing': ['test', 'spec', 'coverage', 'unit'],
      'Documentation': ['document', 'readme', 'comment', 'explain'],
    };

    for (const msg of messages.slice(0, -5)) {
      const content = this.extractText(msg).toLowerCase();

      // Detect topic
      let detectedTopic = 'General Discussion';
      for (const [topic, keywords] of Object.entries(topicKeywords)) {
        if (keywords.some(kw => content.includes(kw))) {
          detectedTopic = topic;
          break;
        }
      }

      // Start new cluster if topic changes
      if (detectedTopic !== currentTopic && currentCluster.length > 0) {
        clusters.push({
          topic: currentTopic,
          messages: currentCluster,
        });
        currentCluster = [];
      }

      currentTopic = detectedTopic;
      currentCluster.push(msg);
    }

    // Add last cluster
    if (currentCluster.length > 0) {
      clusters.push({
        topic: currentTopic,
        messages: currentCluster,
      });
    }

    return clusters;
  }

  private summarizeCluster(cluster: { topic: string; messages: MessageParam[] }): string {
    const points: string[] = [];

    points.push(`Discussed ${cluster.messages.length} messages about ${cluster.topic}`);

    // Extract key points
    const toolsUsed = new Set<string>();
    for (const msg of cluster.messages) {
      if (Array.isArray(msg.content)) {
        for (const block of msg.content as any[]) {
          if (block.type === 'tool_use') {
            toolsUsed.add(block.name);
          }
        }
      }
    }

    if (toolsUsed.size > 0) {
      points.push(`Tools: ${Array.from(toolsUsed).join(', ')}`);
    }

    return points.join('\n');
  }

  private extractText(msg: MessageParam): string {
    if (typeof msg.content === 'string') {
      return msg.content;
    }

    if (Array.isArray(msg.content)) {
      return msg.content
        .filter((b: any) => b.type === 'text')
        .map((b: any) => b.text)
        .join(' ');
    }

    return '';
  }
}

// ============================================
// Token Budget Strategy
// ============================================

export class TokenBudgetStrategy implements CompressionStrategy {
  name = 'token_budget';
  description = 'Allocate token budget across different context sources';

  private tokenCounter: (text: string) => number;

  constructor(tokenCounter?: (text: string) => number) {
    this.tokenCounter = tokenCounter || ((text: string) => Math.ceil(text.length / 4));
  }

  compress(messages: MessageParam[], options?: CompressionOptions): MessageParam[] {
    const maxTokens = options?.maxTokens || 10000;

    // Budget allocation
    const budget = {
      system: maxTokens * 0.1,        // 10% for system
      history: maxTokens * 0.5,       // 50% for history
      recent: maxTokens * 0.3,        // 30% for recent
      buffer: maxTokens * 0.1,        // 10% buffer
    };

    const result: MessageParam[] = [];

    // Process messages from newest to oldest
    const reversed = [...messages].reverse();
    let usedTokens = 0;
    const recentMessages: MessageParam[] = [];

    // Add recent messages within budget
    for (const msg of reversed) {
      const tokens = this.countMessageTokens(msg);

      if (usedTokens + tokens <= budget.recent) {
        recentMessages.unshift(msg);
        usedTokens += tokens;
      } else {
        break;
      }
    }

    // Add remaining messages as summary
    const remainingMessages = messages.slice(0, messages.length - recentMessages.length);

    if (remainingMessages.length > 0) {
      const summary = this.summarizeWithBudget(remainingMessages, budget.history);
      result.push({
        role: 'user',
        content: `[Previous Context]\n${summary}`,
      });
    }

    // Add recent messages
    result.push(...recentMessages);

    return result;
  }

  private countMessageTokens(msg: MessageParam): number {
    if (typeof msg.content === 'string') {
      return this.tokenCounter(msg.content);
    }

    if (Array.isArray(msg.content)) {
      let total = 0;
      for (const block of msg.content as any[]) {
        if (block.type === 'text') {
          total += this.tokenCounter(block.text);
        } else if (block.type === 'tool_result') {
          total += this.tokenCounter(String(block.content));
        }
      }
      return total;
    }

    return 0;
  }

  private summarizeWithBudget(messages: MessageParam[], budget: number): string {
    const summaries: string[] = [];
    let usedTokens = 0;

    // Create summaries until budget exhausted
    for (let i = 0; i < messages.length; i += 5) {
      const batch = messages.slice(i, i + 5);
      const summary = this.summarizeBatch(batch);
      const summaryTokens = this.tokenCounter(summary);

      if (usedTokens + summaryTokens <= budget) {
        summaries.push(summary);
        usedTokens += summaryTokens;
      } else {
        break;
      }
    }

    return summaries.join('\n\n');
  }

  private summarizeBatch(messages: MessageParam[]): string {
    const points: string[] = [];
    let userQueries = 0;
    let toolCalls = 0;

    for (const msg of messages) {
      if (msg.role === 'user') {
        userQueries++;

        if (typeof msg.content === 'string') {
          points.push(`User: ${msg.content.slice(0, 50)}...`);
        }
      } else {
        if (Array.isArray(msg.content)) {
          const tools = msg.content.filter((b: any) => b.type === 'tool_use');
          toolCalls += tools.length;
        }
      }
    }

    points.push(`(${userQueries} queries, ${toolCalls} tool calls)`);

    return points.join('\n');
  }
}

// ============================================
// Adaptive Compression Strategy
// ============================================

export class AdaptiveCompressionStrategy implements CompressionStrategy {
  name = 'adaptive';
  description = 'Dynamically choose compression based on content type';

  private strategies: Map<string, CompressionStrategy>;

  constructor() {
    this.strategies = new Map([
      ['sliding_window', new SlidingWindowStrategy()],
      ['hierarchical', new HierarchicalCompressionStrategy()],
      ['semantic_clustering', new SemanticClusteringStrategy()],
      ['token_budget', new TokenBudgetStrategy()],
    ]);
  }

  compress(messages: MessageParam[], options?: CompressionOptions): MessageParam[] {
    // Analyze message characteristics
    const analysis = this.analyzeMessages(messages);

    // Choose best strategy based on analysis
    const strategy = this.selectStrategy(analysis);

    // Apply selected strategy
    const result = strategy.compress(messages, options);

    return result;
  }

  private analyzeMessages(messages: MessageParam[]): {
    totalMessages: number;
    toolUseRatio: number;
    avgMessageLength: number;
    topicDiversity: number;
  } {
    let toolUses = 0;
    let totalLength = 0;
    const topics = new Set<string>();

    for (const msg of messages) {
      if (Array.isArray(msg.content)) {
        for (const block of msg.content as any[]) {
          if (block.type === 'tool_use') {
            toolUses++;
          }
          if (block.type === 'text') {
            totalLength += block.text.length;

            // Simple topic detection
            const words = block.text.toLowerCase().split(/\s+/);
            words.forEach(word => {
              if (word.length > 5) {
                topics.add(word);
              }
            });
          }
        }
      } else if (typeof msg.content === 'string') {
        totalLength += msg.content.length;
      }
    }

    return {
      totalMessages: messages.length,
      toolUseRatio: toolUses / messages.length,
      avgMessageLength: totalLength / messages.length,
      topicDiversity: topics.size / messages.length,
    };
  }

  private selectStrategy(analysis: {
    totalMessages: number;
    toolUseRatio: number;
    avgMessageLength: number;
    topicDiversity: number;
  }): CompressionStrategy {
    // High tool use ratio -> semantic clustering
    if (analysis.toolUseRatio > 0.5) {
      return this.strategies.get('semantic_clustering')!;
    }

    // Long messages -> hierarchical
    if (analysis.avgMessageLength > 500) {
      return this.strategies.get('hierarchical')!;
    }

    // High topic diversity -> semantic clustering
    if (analysis.topicDiversity > 0.3) {
      return this.strategies.get('semantic_clustering')!;
    }

    // Large message count -> token budget
    if (analysis.totalMessages > 50) {
      return this.strategies.get('token_budget')!;
    }

    // Default -> sliding window
    return this.strategies.get('sliding_window')!;
  }
}

// ============================================
// Compression Factory
// ============================================

export class CompressionFactory {
  private static strategies: Map<string, CompressionStrategy> = new Map([
    ['sliding_window', new SlidingWindowStrategy()],
    ['hierarchical', new HierarchicalCompressionStrategy()],
    ['semantic_clustering', new SemanticClusteringStrategy()],
    ['token_budget', new TokenBudgetStrategy()],
    ['adaptive', new AdaptiveCompressionStrategy()],
  ]);

  static getStrategy(name: string): CompressionStrategy | undefined {
    return this.strategies.get(name);
  }

  static getAllStrategies(): CompressionStrategy[] {
    return Array.from(this.strategies.values());
  }

  static registerStrategy(strategy: CompressionStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }
}
