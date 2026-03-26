/**
 * LLM Client - Complete Implementation
 *
 * Restored from Bun 2.1.83 binary
 * Handles streaming communication with Anthropic Claude API
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  Message,
  MessageParam,
  ContentBlock,
  Tool,
} from '@anthropic-ai/sdk/resources/messages';
import { EventEmitter } from 'events';

// ============================================
// Type Definitions
// ============================================

export interface LLMConfig {
  apiKey?: string;
  model: string;
  maxTokens: number;
  temperature?: number;
  baseUrl?: string;
  timeout?: number;
  maxRetries?: number;
}

export interface StreamEvent {
  type: 'message_start' | 'content_block_start' | 'content_block_delta' |
        'content_block_stop' | 'message_delta' | 'message_stop' | 'error' | 'text';
  message?: Message;
  index?: number;
  content_block?: ContentBlock;
  delta?: any;
  text?: string;
  error?: Error;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface MessageCreateParams {
  messages: MessageParam[];
  tools?: Tool[];
  system?: string;
  metadata?: Record<string, any>;
  stop_sequences?: string[];
  stream?: boolean;
  thinking?: {
    type: 'enabled' | 'adaptive';
    budget_tokens?: number;
  };
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

// ============================================
// LLM Client Implementation
// ============================================

export class LLMClient extends EventEmitter {
  private client: Anthropic;
  private config: LLMConfig;
  private tokenUsage: TokenUsage = {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
  };

  constructor(config: LLMConfig) {
    super();

    this.config = {
      timeout: 120000, // 2 minutes
      maxRetries: 3,
      temperature: 0.7,
      ...config,
    };

    this.client = new Anthropic({
      apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY,
      baseURL: config.baseUrl,
      timeout: this.config.timeout,
      maxRetries: this.config.maxRetries,
    });
  }

  // ============================================
  // Core Methods
  // ============================================

  /**
   * Create a streaming message
   * Main entry point for agent communication
   */
  async *createMessageStream(
    params: MessageCreateParams
  ): AsyncGenerator<StreamEvent, Message, unknown> {
    try {
      // Emit start event
      this.emit('stream_start', params);

      // Create streaming request
      const stream = this.client.messages.stream({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        messages: params.messages,
        tools: params.tools,
        system: params.system,
        metadata: params.metadata,
        stop_sequences: params.stop_sequences,
        thinking: params.thinking,
      });

      // Track accumulated message
      let accumulatedMessage: Message | null = null;
      let currentContentIndex = 0;

      // Process stream events
      for await (const event of stream) {
        const streamEvent = this.processStreamEvent(event);

        // Yield processed event
        yield streamEvent;

        // Emit for external listeners
        this.emit('stream_event', streamEvent);

        // Handle text deltas specially for convenience
        if (streamEvent.type === 'content_block_delta' &&
            streamEvent.delta?.type === 'text_delta') {
          this.emit('text', streamEvent.delta.text);
        }

        // Track usage
        if (streamEvent.type === 'message_delta' && streamEvent.usage) {
          this.updateTokenUsage(streamEvent.usage);
        }
      }

      // Get final message
      accumulatedMessage = await stream.finalMessage();

      // Emit completion
      this.emit('stream_complete', accumulatedMessage);

      return accumulatedMessage;

    } catch (error: any) {
      const streamError: StreamEvent = {
        type: 'error',
        error: error,
      };

      this.emit('stream_error', error);
      yield streamError;
      throw error;
    }
  }

  /**
   * Create a non-streaming message (for simple requests)
   */
  async createMessage(params: MessageCreateParams): Promise<Message> {
    try {
      this.emit('request_start', params);

      const message = await this.client.messages.create({
        model: this.config.model,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
        messages: params.messages,
        tools: params.tools,
        system: params.system,
        metadata: params.metadata,
        stop_sequences: params.stop_sequences,
      });

      // Update token usage
      if (message.usage) {
        this.updateTokenUsage({
          input_tokens: message.usage.input_tokens,
          output_tokens: message.usage.output_tokens,
        });
      }

      this.emit('request_complete', message);

      return message;

    } catch (error: any) {
      this.emit('request_error', error);
      throw error;
    }
  }

  // ============================================
  // Stream Event Processing
  // ============================================

  /**
   * Process raw stream event into standardized format
   */
  private processStreamEvent(event: any): StreamEvent {
    switch (event.type) {
      case 'message_start':
        return {
          type: 'message_start',
          message: event.message,
        };

      case 'content_block_start':
        return {
          type: 'content_block_start',
          index: event.index,
          content_block: event.content_block,
        };

      case 'content_block_delta':
        return {
          type: 'content_block_delta',
          index: event.index,
          delta: event.delta,
        };

      case 'content_block_stop':
        return {
          type: 'content_block_stop',
          index: event.index,
        };

      case 'message_delta':
        return {
          type: 'message_delta',
          delta: event.delta,
          usage: event.usage ? {
            input_tokens: event.usage.input_tokens,
            output_tokens: event.usage.output_tokens,
          } : undefined,
        };

      case 'message_stop':
        return {
          type: 'message_stop',
        };

      default:
        return {
          type: 'content_block_delta',
          delta: event,
        };
    }
  }

  // ============================================
  // Tool Use Streaming
  // ============================================

  /**
   * Stream with tool use support
   * Handles automatic tool execution loops
   */
  async *streamWithTools(
    params: MessageCreateParams,
    toolExecutor: (toolName: string, toolInput: any) => Promise<any>
  ): AsyncGenerator<StreamEvent, Message, unknown> {
    let currentMessages = [...params.messages];
    let iterationCount = 0;
    const maxIterations = 10; // Prevent infinite loops

    while (iterationCount < maxIterations) {
      // Stream message
      const stream = this.createMessageStream({
        ...params,
        messages: currentMessages,
      });

      let message: Message | null = null;

      // Process all events
      for await (const event of stream) {
        yield event;

        // Capture final message
        if (event.type === 'message_start') {
          message = event.message;
        }
      }

      // Get final message if not captured
      if (!message) {
        message = await stream.return(undefined as any);
      }

      if (!message) {
        throw new Error('No message received from stream');
      }

      // Check for tool use
      const toolUseBlocks = message.content.filter(
        (block): block is any => block.type === 'tool_use'
      );

      if (toolUseBlocks.length === 0) {
        // No tool use, we're done
        return message;
      }

      // Execute tools
      const toolResults = [];
      for (const toolUse of toolUseBlocks) {
        try {
          const result = await toolExecutor(toolUse.name, toolUse.input);

          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: JSON.stringify(result),
          });

          // Emit tool execution event
          this.emit('tool_executed', {
            name: toolUse.name,
            input: toolUse.input,
            result,
          });

        } catch (error: any) {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: JSON.stringify({ error: error.message }),
            is_error: true,
          });

          this.emit('tool_error', {
            name: toolUse.name,
            error,
          });
        }
      }

      // Add assistant message and tool results to conversation
      currentMessages.push({
        role: 'assistant',
        content: message.content,
      });

      currentMessages.push({
        role: 'user',
        content: toolResults,
      });

      iterationCount++;
    }

    throw new Error('Maximum tool use iterations reached');
  }

  // ============================================
  // Token Management
  // ============================================

  /**
   * Update token usage tracking
   */
  private updateTokenUsage(usage: { input_tokens: number; output_tokens: number }) {
    this.tokenUsage.inputTokens += usage.input_tokens;
    this.tokenUsage.outputTokens += usage.output_tokens;
    this.tokenUsage.totalTokens = this.tokenUsage.inputTokens + this.tokenUsage.outputTokens;

    this.emit('token_usage', this.tokenUsage);
  }

  /**
   * Get current token usage
   */
  getTokenUsage(): TokenUsage {
    return { ...this.tokenUsage };
  }

  /**
   * Reset token usage counters
   */
  resetTokenUsage(): void {
    this.tokenUsage = {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    };
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Count tokens in a message (approximate)
   */
  countTokens(text: string): number {
    // Simple approximation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Count tokens in messages array
   */
  countMessageTokens(messages: MessageParam[]): number {
    let total = 0;

    for (const msg of messages) {
      if (typeof msg.content === 'string') {
        total += this.countTokens(msg.content);
      } else if (Array.isArray(msg.content)) {
        for (const block of msg.content) {
          if (block.type === 'text') {
            total += this.countTokens(block.text);
          } else if (block.type === 'tool_result') {
            total += this.countTokens(block.content);
          }
        }
      }
    }

    return total;
  }

  /**
   * Get model information
   */
  getModelInfo(): { model: string; maxTokens: number; temperature: number } {
    return {
      model: this.config.model,
      maxTokens: this.config.maxTokens,
      temperature: this.config.temperature || 0.7,
    };
  }

  /**
   * Check if client is properly configured
   */
  isConfigured(): boolean {
    return !!(this.config.apiKey || process.env.ANTHROPIC_API_KEY);
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<LLMConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
    };

    // Recreate client if necessary
    if (newConfig.apiKey || newConfig.baseUrl) {
      this.client = new Anthropic({
        apiKey: this.config.apiKey || process.env.ANTHROPIC_API_KEY,
        baseURL: this.config.baseUrl,
        timeout: this.config.timeout,
        maxRetries: this.config.maxRetries,
      });
    }
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Create LLM client with default configuration
 */
export function createLLMClient(config: Partial<LLMConfig> = {}): LLMClient {
  return new LLMClient({
    model: 'claude-sonnet-4-6',
    maxTokens: 8192,
    temperature: 0.7,
    ...config,
  });
}

/**
 * Format message for display
 */
export function formatMessage(message: Message): string {
  const textBlocks = message.content.filter(
    (block): block is any => block.type === 'text'
  );

  return textBlocks.map(b => b.text).join('\n');
}

/**
 * Extract tool uses from message
 */
export function extractToolUses(message: Message): Array<{ name: string; input: any; id: string }> {
  return message.content
    .filter((block): block is any => block.type === 'tool_use')
    .map(block => ({
      name: block.name,
      input: block.input,
      id: block.id,
    }));
}
