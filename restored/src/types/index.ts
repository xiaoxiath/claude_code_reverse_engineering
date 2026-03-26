// ============================================
// Claude Code Agent - Core Types
// ============================================

// 基础类型
export interface Message {
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
  timestamp?: number;
}

export type ContentBlock =
  | TextBlock
  | ToolUseBlock
  | ToolResultBlock;

export interface TextBlock {
  type: 'text';
  text: string;
}

export interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, any>;
}

export interface ToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

// ============================================
// Tool System
// ============================================

export interface Tool {
  name: string;
  description: string;
  input_schema: JSONSchema;
  execute(params: any): Promise<any>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, JSONSchema>;
    required?: string[];
  };
}

export interface JSONSchema {
  type: string;
  description?: string;
  properties?: Record<string, JSONSchema>;
  required?: string[];
  items?: JSONSchema;
  enum?: string[];
  default?: any;
  [key: string]: any;
}

export interface ToolExecutor {
  execute(toolName: string, params: any): Promise<any>;
  getToolDefinitions(): ToolDefinition[];
}

// ============================================
// Permission System
// ============================================

export type PermissionMode = 'allow' | 'deny' | 'interactive' | 'sandbox';

export interface PermissionRule {
  tool?: string;
  action?: string;
  resource?: string;
  mode: PermissionMode;
  reason?: string;
}

export interface PermissionConfig {
  mode: PermissionMode;
  rules?: PermissionRule[];
}

export interface PermissionStrategy {
  check(tool: string, params: any): Promise<boolean>;
}

// ============================================
// Session Management
// ============================================

export interface Session {
  id: string;
  conversationHistory: Message[];
  context: ExecutionContext;
  memory: MemoryEntry[];
  createdAt: number;
  updatedAt: number;
}

export interface ExecutionContext {
  workingDirectory: string;
  environment: Record<string, string>;
  tasks: Task[];
  variables: Record<string, any>;
}

export interface MemoryEntry {
  type: 'user' | 'feedback' | 'project' | 'reference' | 'compressed_history';
  content: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface Task {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  dependencies?: string[];
  result?: any;
}

// ============================================
// LLM Client
// ============================================

export interface LLMClient {
  createMessageStream(params: {
    messages: Message[];
    tools?: ToolDefinition[];
    system?: string;
    model?: string;
  }): AsyncIterable<StreamEvent>;
}

export type StreamEvent =
  | { type: 'content_block_start'; content_block: ContentBlock }
  | { type: 'content_block_delta'; delta: TextDelta | InputJSONDelta }
  | { type: 'content_block_stop'; index: number }
  | { type: 'message_start'; message: any }
  | { type: 'message_delta'; delta: any }
  | { type: 'message_stop' };

export interface TextDelta {
  type: 'text_delta';
  text: string;
}

export interface InputJSONDelta {
  type: 'input_json_delta';
  partial_json: string;
}

// ============================================
// Config System
// ============================================

export interface AgentConfig {
  llm: LLMConfig;
  permissions: PermissionConfig;
  tools?: ToolConfig;
  session?: SessionConfig;
  debug?: boolean;
}

export interface LLMConfig {
  apiKey?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  baseUrl?: string;
}

export interface ToolConfig {
  enabled?: string[];
  disabled?: string[];
  custom?: Record<string, any>;
}

export interface SessionConfig {
  persistPath?: string;
  maxHistoryLength?: number;
  compressionThreshold?: number;
}

export interface ProjectContext {
  projectName: string;
  description: string;
  architecture: string;
  codingStandards: string;
  workflow: string;
  customInstructions: string;
}

// ============================================
// Error Types
// ============================================

export class ClaudeCodeError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ToolExecutionError extends ClaudeCodeError {
  constructor(toolName: string, reason: string) {
    super(`Tool ${toolName} failed: ${reason}`, 'TOOL_EXECUTION_ERROR');
  }
}

export class PermissionDeniedError extends ClaudeCodeError {
  constructor(resource: string) {
    super(`Permission denied: ${resource}`, 'PERMISSION_DENIED');
  }
}

export class ValidationError extends ClaudeCodeError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
  }
}

export class SessionError extends ClaudeCodeError {
  constructor(message: string) {
    super(message, 'SESSION_ERROR');
  }
}

export class APIError extends ClaudeCodeError {
  constructor(message: string, public statusCode: number) {
    super(message, 'API_ERROR');
  }
}

// ============================================
// Event Types
// ============================================

export interface AgentEvents {
  'user_input': string;
  'tool_call': ToolUseBlock;
  'tool_result': ToolResultBlock;
  'permission_request': { tool: string; params: any };
  'message': Message;
  'error': Error;
  'response': string;
  'session_created': Session;
  'session_loaded': string;
  'session_saved': string;
  'history_compressed': string;
}
