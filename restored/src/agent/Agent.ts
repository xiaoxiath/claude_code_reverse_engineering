/**
 * Agent Core - Complete Implementation
 *
 * Restored from Bun 2.1.83 binary
 * Main Agent class coordinating all components
 */

import { EventEmitter } from 'events';
import { LLMClient } from '../llm/client';
import { ToolExecutor } from '../tools/registry';
import { PermissionManager } from '../permissions/manager';
import { SessionManager, Session } from '../session/manager';
import type { MessageParam, ContentBlock } from '@anthropic-ai/sdk/resources/messages';

// ============================================
// Type Definitions
// ============================================

enum AgentState {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  CHECKING_PERMISSION = 'CHECKING_PERMISSION',
  EXECUTING_TOOL = 'EXECUTING_TOOL',
  SENDING_RESULT = 'SENDING_RESULT',
  RESPONDING = 'RESPONDING',
  COMPLETED = 'COMPLETED'
}

export interface AgentConfig {
  llm: {
    model: string;
    maxTokens: number;
    temperature?: number;
    apiKey?: string;
  };
  tools?: any;
  permissions?: any;
  session?: any;
}

// ============================================
// Agent Implementation
// ============================================

export class Agent extends EventEmitter {
  private state: AgentState = AgentState.IDLE;
  private llmClient: LLMClient;
  private toolExecutor: ToolExecutor;
  private permissionManager: PermissionManager;
  private sessionManager: SessionManager;

  // Current tool call tracking
  private currentToolUse: any = null;
  private toolInputBuffer: string = '';

  constructor(config: AgentConfig) {
    super();

    // Initialize components
    this.llmClient = new LLMClient({
      model: config.llm.model,
      maxTokens: config.llm.maxTokens,
      temperature: config.llm.temperature,
      apiKey: config.llm.apiKey,
    });

    this.toolExecutor = new ToolExecutor(config.tools || {});
    this.permissionManager = new PermissionManager(config.permissions || {});
    this.sessionManager = new SessionManager(config.session || {});

    // Setup event handlers
    this.setupEventHandlers();
  }

  // ============================================
  // Main Entry Point
  // ============================================

  /**
   * Process user input
   * Main entry point for agent interaction
   */
  async processUserInput(input: string): Promise<string> {
    this.setState(AgentState.PROCESSING);
    this.emit('user_input', input);

    try {
      // 1. Add user message to session
      this.sessionManager.addMessage({
        role: 'user',
        content: input,
      });

      // 2. Call LLM API (streaming)
      const stream = this.llmClient.createMessageStream({
        messages: this.sessionManager.getMessages(),
        tools: this.toolExecutor.getToolDefinitions(),
        system: await this.buildSystemPrompt(),
      });

      // 3. Process streaming response
      let response = '';
      const assistantMessage: ContentBlock[] = [];

      for await (const event of stream) {
        const result = await this.handleStreamEvent(event, assistantMessage);
        if (result) {
          response += result;
        }
      }

      // 4. Add assistant message to session
      if (assistantMessage.length > 0) {
        this.sessionManager.addMessage({
          role: 'assistant',
          content: assistantMessage,
        });
      }

      this.setState(AgentState.COMPLETED);
      this.emit('response', response);

      return response;

    } catch (error: any) {
      this.emit('error', error);
      this.setState(AgentState.IDLE);
      throw error;
    }
  }

  // ============================================
  // Stream Event Processing
  // ============================================

  /**
   * Handle stream event from LLM
   */
  private async handleStreamEvent(
    event: any,
    assistantMessage: ContentBlock[]
  ): Promise<string | null> {
    switch (event.type) {
      case 'content_block_start':
        return this.handleContentBlockStart(event, assistantMessage);

      case 'content_block_delta':
        return this.handleContentBlockDelta(event);

      case 'content_block_stop':
        return await this.handleContentBlockStop(event);

      default:
        return null;
    }
  }

  /**
   * Handle content block start
   */
  private handleContentBlockStart(
    event: any,
    assistantMessage: ContentBlock[]
  ): null {
    const block = event.content_block;

    if (block.type === 'text') {
      assistantMessage.push({
        type: 'text',
        text: '',
      } as any);
    } else if (block.type === 'tool_use') {
      this.currentToolUse = {
        type: 'tool_use',
        id: block.id,
        name: block.name,
        input: {},
      };

      assistantMessage.push(this.currentToolUse);
      this.toolInputBuffer = '';

      this.emit('tool_call', this.currentToolUse);
    }

    return null;
  }

  /**
   * Handle content block delta
   */
  private handleContentBlockDelta(event: any): string | null {
    const delta = event.delta;

    if (delta.type === 'text_delta') {
      // Stream text output
      process.stdout.write(delta.text);
      return delta.text;
    } else if (delta.type === 'input_json_delta') {
      // Accumulate tool parameters
      this.toolInputBuffer += delta.partial_json;
      return null;
    }

    return null;
  }

  /**
   * Handle content block stop
   */
  private async handleContentBlockStop(event: any): Promise<string | null> {
    if (this.currentToolUse && this.toolInputBuffer) {
      // Parse complete tool parameters
      try {
        this.currentToolUse.input = JSON.parse(this.toolInputBuffer);
      } catch (error) {
        console.error('Failed to parse tool input:', error);
      }

      // Execute tool call
      const result = await this.executeToolCall(this.currentToolUse);

      // Clear state
      this.currentToolUse = null;
      this.toolInputBuffer = '';

      return result;
    }

    return null;
  }

  // ============================================
  // Tool Execution
  // ============================================

  /**
   * Execute tool call
   */
  private async executeToolCall(toolUse: any): Promise<string | null> {
    this.setState(AgentState.CHECKING_PERMISSION);

    try {
      // 1. Permission check
      const decision = await this.permissionManager.checkPermission(
        toolUse.name,
        toolUse.input
      );

      if (!decision.granted) {
        throw new Error(`Tool ${toolUse.name} permission denied: ${decision.reason}`);
      }

      // 2. Execute tool
      this.setState(AgentState.EXECUTING_TOOL);
      const result = await this.toolExecutor.execute(
        toolUse.name,
        toolUse.input
      );

      // 3. Construct tool_result
      const toolResult = {
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
      };

      this.emit('tool_result', toolResult);

      // 4. Send result back to LLM
      this.setState(AgentState.SENDING_RESULT);

      this.sessionManager.addMessage({
        role: 'user',
        content: [toolResult] as any,
      });

      // 5. Continue conversation
      return await this.processUserInput('');

    } catch (error: any) {
      // Construct error tool_result
      const errorResult = {
        type: 'tool_result',
        tool_use_id: toolUse.id,
        content: `Error: ${error.message}`,
        is_error: true,
      };

      this.emit('tool_result', errorResult);

      this.sessionManager.addMessage({
        role: 'user',
        content: [errorResult] as any,
      });

      return await this.processUserInput('');
    }
  }

  // ============================================
  // System Prompt
  // ============================================

  /**
   * Build system prompt
   */
  private async buildSystemPrompt(): Promise<string> {
    const projectContext = await this.loadProjectContext();

    return `You are Claude Code, Anthropic's official CLI for Claude.

${projectContext}

## Available Tools

You have access to the following tools:
${this.toolExecutor.getToolDescriptions().join('\n')}

## Working Directory

Current working directory: ${process.cwd()}

## Instructions

1. Use tools when needed to accomplish tasks
2. Always check permissions before executing tools
3. Provide clear explanations of your actions
4. Follow coding best practices and project standards`;
  }

  /**
   * Load project context from CLAUDE.md
   */
  private async loadProjectContext(): Promise<string> {
    try {
      const file = Bun.file('.claude/CLAUDE.md');
      const content = await file.text();

      return `## Project Context\n\n${content}`;
    } catch (error) {
      return '';
    }
  }

  // ============================================
  // State Management
  // ============================================

  /**
   * Set agent state
   */
  private setState(newState: AgentState): void {
    const oldState = this.state;
    this.state = newState;

    this.emit('state_change', {
      from: oldState,
      to: newState,
    });
  }

  /**
   * Get current state
   */
  getState(): AgentState {
    return this.state;
  }

  // ============================================
  // Event Handlers
  // ============================================

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Session events
    this.sessionManager.on('session_created', (session) => {
      this.emit('session_created', session);
    });

    this.sessionManager.on('session_compressed', (data) => {
      this.emit('session_compressed', data);
    });

    // Permission events
    this.permissionManager.on('permission_decision', (data) => {
      this.emit('permission_decision', data);
    });

    // LLM events
    this.llmClient.on('stream_event', (event) => {
      this.emit('llm_event', event);
    });

    this.llmClient.on('token_usage', (usage) => {
      this.emit('token_usage', usage);
    });
  }

  // ============================================
  // Session Management
  // ============================================

  /**
   * Get current session
   */
  getCurrentSession(): Session | null {
    return this.sessionManager.getCurrentSession();
  }

  /**
   * Save session
   */
  async saveSession(): Promise<void> {
    await this.sessionManager.saveSession();
    this.emit('session_saved');
  }

  /**
   * Load session
   */
  async loadSession(sessionId: string): Promise<Session> {
    const session = await this.sessionManager.loadSession(sessionId);
    this.emit('session_loaded', session);
    return session;
  }

  /**
   * Create new session
   */
  createSession(): Session {
    return this.sessionManager.createSession();
  }

  // ============================================
  // Cleanup
  // ============================================

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.permissionManager.cleanup();
    this.sessionManager.removeAllListeners();
    this.llmClient.removeAllListeners();
    this.removeAllListeners();
  }
}
