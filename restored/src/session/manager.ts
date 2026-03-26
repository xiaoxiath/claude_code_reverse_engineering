/**
 * Session Manager - Complete Implementation
 *
 * Restored from Bun 2.1.83 binary
 * Manages conversation history, context compression, and session persistence
 */

import { EventEmitter } from 'events';
import type { MessageParam } from '@anthropic-ai/sdk/resources/messages';

// ============================================
// Type Definitions
// ============================================

export interface SessionConfig {
  maxMessages: number;
  maxTokens: number;
  compressionThreshold: number;
  persistenceEnabled: boolean;
  persistencePath?: string;
}

export interface Session {
  id: string;
  messages: MessageParam[];
  metadata: SessionMetadata;
  createdAt: number;
  updatedAt: number;
}

export interface SessionMetadata {
  projectId?: string;
  userId?: string;
  tags?: string[];
  [key: string]: any;
}

export interface CompressionResult {
  compressed: boolean;
  removedMessages: number;
  tokensSaved: number;
}

// ============================================
// Session Manager Implementation
// ============================================

export class SessionManager extends EventEmitter {
  private sessions: Map<string, Session> = new Map();
  private currentSessionId: string | null = null;
  private config: SessionConfig;
  private tokenCounter: (text: string) => number;

  constructor(
    config: Partial<SessionConfig> = {},
    tokenCounter?: (text: string) => number
  ) {
    super();

    this.config = {
      maxMessages: 100,
      maxTokens: 100000,
      compressionThreshold: 0.8, // Compress when at 80% capacity
      persistenceEnabled: false,
      ...config,
    };

    // Simple token counter (can be overridden with proper implementation)
    this.tokenCounter = tokenCounter || ((text: string) => Math.ceil(text.length / 4));
  }

  // ============================================
  // Session Lifecycle
  // ============================================

  /**
   * Create a new session
   */
  createSession(metadata: SessionMetadata = {}): Session {
    const session: Session = {
      id: this.generateSessionId(),
      messages: [],
      metadata,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.sessions.set(session.id, session);
    this.currentSessionId = session.id;

    this.emit('session_created', session);

    return session;
  }

  /**
   * Get current session
   */
  getCurrentSession(): Session | null {
    if (!this.currentSessionId) {
      return null;
    }

    return this.sessions.get(this.currentSessionId) || null;
  }

  /**
   * Switch to a different session
   */
  switchSession(sessionId: string): Session {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    this.currentSessionId = sessionId;
    this.emit('session_switched', session);

    return session;
  }

  /**
   * Delete a session
   */
  deleteSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);

    if (!session) {
      return false;
    }

    this.sessions.delete(sessionId);

    if (this.currentSessionId === sessionId) {
      this.currentSessionId = null;
    }

    this.emit('session_deleted', session);

    return true;
  }

  /**
   * List all sessions
   */
  listSessions(): Session[] {
    return Array.from(this.sessions.values());
  }

  // ============================================
  // Message Management
  // ============================================

  /**
   * Add a message to the current session
   */
  addMessage(message: MessageParam): Session {
    const session = this.getCurrentSession();

    if (!session) {
      throw new Error('No active session');
    }

    // Add message
    session.messages.push(message);
    session.updatedAt = Date.now();

    // Check if compression needed
    const tokenCount = this.countSessionTokens(session);

    if (tokenCount > this.config.maxTokens * this.config.compressionThreshold) {
      this.compressSession(session);
    }

    // Enforce max messages limit
    if (session.messages.length > this.config.maxMessages) {
      session.messages = session.messages.slice(-this.config.maxMessages);
    }

    this.emit('message_added', { session, message });

    return session;
  }

  /**
   * Add multiple messages to the current session
   */
  addMessages(messages: MessageParam[]): Session {
    const session = this.getCurrentSession();

    if (!session) {
      throw new Error('No active session');
    }

    for (const message of messages) {
      this.addMessage(message);
    }

    return session;
  }

  /**
   * Get messages from current session
   */
  getMessages(): MessageParam[] {
    const session = this.getCurrentSession();

    if (!session) {
      return [];
    }

    return [...session.messages];
  }

  /**
   * Get message history with optional filtering
   */
  getHistory(options: {
    limit?: number;
    offset?: number;
    role?: 'user' | 'assistant';
  } = {}): MessageParam[] {
    const session = this.getCurrentSession();

    if (!session) {
      return [];
    }

    let messages = [...session.messages];

    // Filter by role
    if (options.role) {
      messages = messages.filter(msg => msg.role === options.role);
    }

    // Apply offset
    if (options.offset) {
      messages = messages.slice(options.offset);
    }

    // Apply limit
    if (options.limit) {
      messages = messages.slice(0, options.limit);
    }

    return messages;
  }

  /**
   * Clear messages from current session
   */
  clearMessages(): void {
    const session = this.getCurrentSession();

    if (session) {
      session.messages = [];
      session.updatedAt = Date.now();

      this.emit('messages_cleared', session);
    }
  }

  // ============================================
  // Context Compression
  // ============================================

  /**
   * Compress session context to reduce token usage
   */
  compressSession(session: Session): CompressionResult {
    const originalTokenCount = this.countSessionTokens(session);
    const originalMessageCount = session.messages.length;

    // Strategy: Keep first message (usually system), last N messages, and summarize middle
    const keepFirst = 1;
    const keepLast = 5;

    if (session.messages.length <= keepFirst + keepLast) {
      return {
        compressed: false,
        removedMessages: 0,
        tokensSaved: 0,
      };
    }

    // Extract messages to compress
    const firstMessages = session.messages.slice(0, keepFirst);
    const lastMessages = session.messages.slice(-keepLast);
    const middleMessages = session.messages.slice(keepFirst, -keepLast);

    // Create summary of middle messages
    const summary = this.summarizeMessages(middleMessages);

    // Reconstruct session with compressed context
    session.messages = [
      ...firstMessages,
      {
        role: 'user' as const,
        content: `[Previous context summary: ${summary}]`,
      },
      ...lastMessages,
    ];

    const newTokenCount = this.countSessionTokens(session);

    const result: CompressionResult = {
      compressed: true,
      removedMessages: originalMessageCount - session.messages.length,
      tokensSaved: originalTokenCount - newTokenCount,
    };

    this.emit('session_compressed', { session, result });

    return result;
  }

  /**
   * Summarize messages for compression
   */
  private summarizeMessages(messages: MessageParam[]): string {
    const parts: string[] = [];

    for (const message of messages) {
      const role = message.role;
      let content = '';

      if (typeof message.content === 'string') {
        content = message.content.slice(0, 200);
      } else if (Array.isArray(message.content)) {
        const textBlocks = message.content.filter((b: any) => b.type === 'text');
        content = textBlocks.map((b: any) => b.text).join(' ').slice(0, 200);
      }

      parts.push(`${role}: ${content}...`);
    }

    return parts.join('\n');
  }

  /**
   * Count tokens in session
   */
  countSessionTokens(session: Session): number {
    let total = 0;

    for (const message of session.messages) {
      if (typeof message.content === 'string') {
        total += this.tokenCounter(message.content);
      } else if (Array.isArray(message.content)) {
        for (const block of message.content) {
          if ((block as any).type === 'text') {
            total += this.tokenCounter((block as any).text);
          } else if ((block as any).type === 'tool_result') {
            total += this.tokenCounter(String((block as any).content));
          }
        }
      }
    }

    return total;
  }

  // ============================================
  // Persistence
  // ============================================

  /**
   * Save session to disk
   */
  async saveSession(sessionId?: string): Promise<void> {
    if (!this.config.persistenceEnabled) {
      return;
    }

    const id = sessionId || this.currentSessionId;

    if (!id) {
      throw new Error('No session to save');
    }

    const session = this.sessions.get(id);

    if (!session) {
      throw new Error(`Session not found: ${id}`);
    }

    const path = this.getSessionPath(id);
    const data = JSON.stringify(session, null, 2);

    await Bun.write(path, data);

    this.emit('session_saved', session);
  }

  /**
   * Load session from disk
   */
  async loadSession(sessionId: string): Promise<Session> {
    if (!this.config.persistenceEnabled) {
      throw new Error('Persistence not enabled');
    }

    const path = this.getSessionPath(sessionId);

    try {
      const file = Bun.file(path);
      const data = await file.text();
      const session = JSON.parse(data) as Session;

      this.sessions.set(session.id, session);
      this.currentSessionId = session.id;

      this.emit('session_loaded', session);

      return session;
    } catch (error) {
      throw new Error(`Failed to load session ${sessionId}: ${error}`);
    }
  }

  /**
   * Save all sessions
   */
  async saveAllSessions(): Promise<void> {
    if (!this.config.persistenceEnabled) {
      return;
    }

    for (const sessionId of this.sessions.keys()) {
      await this.saveSession(sessionId);
    }
  }

  /**
   * Get session file path
   */
  private getSessionPath(sessionId: string): string {
    const base = this.config.persistencePath || './sessions';
    return `${base}/${sessionId}.json`;
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get session statistics
   */
  getSessionStats(sessionId?: string): {
    messageCount: number;
    tokenCount: number;
    age: number;
    lastUpdated: number;
  } {
    const id = sessionId || this.currentSessionId;

    if (!id) {
      throw new Error('No session available');
    }

    const session = this.sessions.get(id);

    if (!session) {
      throw new Error(`Session not found: ${id}`);
    }

    return {
      messageCount: session.messages.length,
      tokenCount: this.countSessionTokens(session),
      age: Date.now() - session.createdAt,
      lastUpdated: Date.now() - session.updatedAt,
    };
  }

  /**
   * Search messages in session
   */
  searchMessages(query: string, sessionId?: string): MessageParam[] {
    const id = sessionId || this.currentSessionId;

    if (!id) {
      return [];
    }

    const session = this.sessions.get(id);

    if (!session) {
      return [];
    }

    const lowerQuery = query.toLowerCase();

    return session.messages.filter(message => {
      if (typeof message.content === 'string') {
        return message.content.toLowerCase().includes(lowerQuery);
      } else if (Array.isArray(message.content)) {
        return message.content.some((block: any) => {
          if (block.type === 'text') {
            return block.text.toLowerCase().includes(lowerQuery);
          }
          return false;
        });
      }
      return false;
    });
  }

  /**
   * Export session to various formats
   */
  exportSession(format: 'json' | 'markdown' | 'text', sessionId?: string): string {
    const id = sessionId || this.currentSessionId;

    if (!id) {
      throw new Error('No session to export');
    }

    const session = this.sessions.get(id);

    if (!session) {
      throw new Error(`Session not found: ${id}`);
    }

    switch (format) {
      case 'json':
        return JSON.stringify(session, null, 2);

      case 'markdown':
        return this.sessionToMarkdown(session);

      case 'text':
        return this.sessionToText(session);

      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Convert session to markdown
   */
  private sessionToMarkdown(session: Session): string {
    const lines: string[] = [
      `# Session ${session.id}`,
      ``,
      `Created: ${new Date(session.createdAt).toISOString()}`,
      `Updated: ${new Date(session.updatedAt).toISOString()}`,
      ``,
      `## Messages`,
      ``,
    ];

    for (const message of session.messages) {
      lines.push(`### ${message.role}`);

      if (typeof message.content === 'string') {
        lines.push(message.content);
      } else if (Array.isArray(message.content)) {
        for (const block of message.content as any[]) {
          if (block.type === 'text') {
            lines.push(block.text);
          } else if (block.type === 'tool_use') {
            lines.push(`\n**Tool: ${block.name}**`);
            lines.push('```json');
            lines.push(JSON.stringify(block.input, null, 2));
            lines.push('```');
          } else if (block.type === 'tool_result') {
            lines.push(`\n**Result:**`);
            lines.push(block.content);
          }
        }
      }

      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * Convert session to plain text
   */
  private sessionToText(session: Session): string {
    const lines: string[] = [];

    for (const message of session.messages) {
      lines.push(`${message.role.toUpperCase()}:`);

      if (typeof message.content === 'string') {
        lines.push(message.content);
      } else if (Array.isArray(message.content)) {
        for (const block of message.content as any[]) {
          if (block.type === 'text') {
            lines.push(block.text);
          }
        }
      }

      lines.push('');
    }

    return lines.join('\n');
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Create session manager with default configuration
 */
export function createSessionManager(
  config: Partial<SessionConfig> = {}
): SessionManager {
  return new SessionManager(config);
}
