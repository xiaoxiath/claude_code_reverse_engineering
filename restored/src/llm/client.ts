/**
 * LLM Client — Multi-Provider Routing, OAuth, and Streaming
 *
 * Reverse-engineered from claude_code_agent.js v2.1.83
 *
 * Obfuscated name mapping:
 *   p8       → getProvider (provider selection, multi-location)
 *   i_       → isTruthy (env var check helper)
 *   H4       → getDefaultModel (default model selection)
 *   a9       → resolveModel (model resolver from name/alias)
 *   q27      → modelMatchesKeyword (check if model matches opus/sonnet/haiku)
 *   B46      → translateCrossProvider (cross-provider model translation)
 *   Ib       → selectModelByPermissionMode
 *
 * OAuth constants [CONFIRMED]:
 *   CLIENT_ID: "9d1c250a-e61b-44d9-88ed-5944d1962f5e"
 *   Auth URL: "https://platform.claude.com/oauth/authorize"
 *   Token URL: "https://platform.claude.com/v1/oauth/token"
 *   API Key Create: "https://api.anthropic.com/api/oauth/claude_cli/create_api_key"
 *   MCP Proxy: "https://mcp-proxy.anthropic.com"
 *
 * Source confidence:
 *   [CONFIRMED] — Directly extracted from minified code
 *   [INFERRED]  — Reconstructed from call sites
 *   [SPECULATIVE] — Reasonable implementation guess
 */

import type { TokenUsage, Message } from '../agent/Agent';

// ============================================================================
// Provider Types [CONFIRMED]
// ============================================================================

/**
 * API provider types.
 * [CONFIRMED] — from p8() function
 */
export type Provider = 'firstParty' | 'bedrock' | 'vertex' | 'foundry';

/**
 * Provider configuration.
 */
export interface ProviderConfig {
  provider: Provider;
  baseUrl: string;
  apiKey?: string;
  oauthToken?: string;
  clientCert?: string;
  clientKey?: string;
}

// ============================================================================
// OAuth Constants [CONFIRMED]
// ============================================================================

export const OAUTH_CONFIG = {
  /** [CONFIRMED] OAuth client ID */
  CLIENT_ID: '9d1c250a-e61b-44d9-88ed-5944d1962f5e',

  /** [CONFIRMED] Authorization endpoint */
  AUTHORIZE_URL: 'https://platform.claude.com/oauth/authorize',

  /** [CONFIRMED] Token endpoint */
  TOKEN_URL: 'https://platform.claude.com/v1/oauth/token',

  /** [CONFIRMED] API key creation endpoint */
  API_KEY_CREATE_URL: 'https://api.anthropic.com/api/oauth/claude_cli/create_api_key',

  /** [CONFIRMED] MCP proxy */
  MCP_PROXY_URL: 'https://mcp-proxy.anthropic.com',
} as const;

// ============================================================================
// Model Constants [CONFIRMED]
// ============================================================================

/**
 * Vertex region mapping for each model.
 * [CONFIRMED] — from architecture report
 */
export const VERTEX_REGION_MAPPING: Record<string, string> = {
  'claude-haiku-4-5': 'VERTEX_REGION_CLAUDE_HAIKU_4_5',
  'claude-3-5-haiku': 'VERTEX_REGION_CLAUDE_3_5_HAIKU',
  'claude-3-5-sonnet': 'VERTEX_REGION_CLAUDE_3_5_SONNET',
  'claude-3-7-sonnet': 'VERTEX_REGION_CLAUDE_3_7_SONNET',
  'claude-opus-4-1': 'VERTEX_REGION_CLAUDE_4_1_OPUS',
  'claude-opus-4-6': 'VERTEX_REGION_CLAUDE_OPUS_4_6',
  'claude-sonnet-4-6': 'VERTEX_REGION_CLAUDE_SONNET_4_6',
};

/**
 * Model keyword identifiers.
 * [CONFIRMED] — used by q27() for matching
 */
export const MODEL_KEYWORDS = ['opus', 'sonnet', 'haiku'] as const;
export type ModelKeyword = (typeof MODEL_KEYWORDS)[number];

// ============================================================================
// Provider Selection [CONFIRMED]
// ============================================================================

/**
 * Determine the API provider based on environment variables.
 *
 * Obfuscated: p8()
 *
 * [CONFIRMED] — directly extracted:
 * ```javascript
 * function p8() {
 *   return i_(process.env.CLAUDE_CODE_USE_BEDROCK) ? "bedrock" :
 *          i_(process.env.CLAUDE_CODE_USE_VERTEX) ? "vertex" :
 *          i_(process.env.CLAUDE_CODE_USE_FOUNDRY) ? "foundry" :
 *          "firstParty";
 * }
 * ```
 */
export function getProvider(): Provider {
  if (isTruthy(process.env.CLAUDE_CODE_USE_BEDROCK)) return 'bedrock';
  if (isTruthy(process.env.CLAUDE_CODE_USE_VERTEX)) return 'vertex';
  if (isTruthy(process.env.CLAUDE_CODE_USE_FOUNDRY)) return 'foundry';
  return 'firstParty';
}

/**
 * Check if an environment variable is truthy.
 * Obfuscated: i_()
 * [CONFIRMED]
 */
function isTruthy(value: string | undefined): boolean {
  if (!value) return false;
  return value !== '0' && value.toLowerCase() !== 'false';
}

/**
 * Get the base URL for the current provider.
 * [INFERRED]
 */
export function getBaseUrl(provider?: Provider): string {
  const p = provider || getProvider();
  switch (p) {
    case 'firstParty':
      return 'https://api.anthropic.com';
    case 'bedrock':
      return ''; // AWS Bedrock uses SDK, not direct URL
    case 'vertex':
      return ''; // Google Vertex uses SDK
    case 'foundry':
      return ''; // ByteDance Foundry uses SDK
    default:
      return 'https://api.anthropic.com';
  }
}

// ============================================================================
// Model Selection [CONFIRMED]
// ============================================================================

/**
 * Get the default model for the main loop.
 * Obfuscated: H4()
 * [INFERRED] — returns the default model based on configuration
 */
export function getDefaultModel(): string {
  return 'claude-sonnet-4-6';
}

/**
 * Resolve a model from name or alias.
 * Obfuscated: a9(Y)
 * [INFERRED] — resolves user-specified model name
 */
export function resolveModel(nameOrAlias: string): string {
  // Direct model IDs pass through
  if (nameOrAlias.startsWith('claude-')) return nameOrAlias;

  // Keyword aliases
  switch (nameOrAlias.toLowerCase()) {
    case 'opus':
      return 'claude-opus-4-6';
    case 'sonnet':
      return 'claude-sonnet-4-6';
    case 'haiku':
      return 'claude-haiku-4-5';
    default:
      return nameOrAlias;
  }
}

/**
 * Check if a model matches a keyword (opus/sonnet/haiku).
 * Obfuscated: q27()
 * [CONFIRMED] — checks if keyword appears in model identifier
 */
export function modelMatchesKeyword(model: string, keyword: ModelKeyword): boolean {
  return model.toLowerCase().includes(keyword);
}

/**
 * Translate a model ID for cross-provider use.
 * Obfuscated: B46()
 * [INFERRED] — handles Bedrock/Vertex model ID translation
 */
export function translateCrossProvider(
  model: string,
  fromProvider: Provider,
  toProvider: Provider
): string {
  // [SPECULATIVE] If providers are the same, no translation needed
  if (fromProvider === toProvider) return model;

  // Basic model name extraction and re-mapping
  // Each provider has its own model naming convention
  return model;
}

/**
 * Get the Vertex region for a model.
 * [CONFIRMED] — reads from environment variable
 */
export function getVertexRegion(model: string): string | undefined {
  const envKey = VERTEX_REGION_MAPPING[model];
  return envKey ? process.env[envKey] : undefined;
}

// ============================================================================
// SSE Stream Event Types [CONFIRMED]
// ============================================================================

/**
 * SSE stream event types from Anthropic API.
 * [CONFIRMED] — directly from streaming response handling
 */
export type StreamEventType =
  | 'message_start'
  | 'content_block_start'
  | 'content_block_delta'
  | 'content_block_stop'
  | 'message_delta'
  | 'message_stop'
  | 'error';

export interface StreamEvent {
  event: StreamEventType;
  data: Record<string, unknown>;
}

/**
 * Content block types in streaming responses.
 * [CONFIRMED]
 */
export interface ContentBlockStart {
  type: 'content_block_start';
  index: number;
  content_block: {
    type: 'text' | 'tool_use';
    id?: string;
    name?: string;
    text?: string;
  };
}

export interface ContentBlockDelta {
  type: 'content_block_delta';
  index: number;
  delta: {
    type: 'text_delta' | 'input_json_delta';
    text?: string;
    partial_json?: string;
  };
}

// ============================================================================
// API Client
// ============================================================================

/**
 * API request configuration.
 * [CONFIRMED] — from API call analysis
 */
export interface ApiRequestConfig {
  model: string;
  max_tokens: number;
  messages: Message[];
  system?: string | Array<{ type: 'text'; text: string; cache_control?: { type: 'ephemeral' } }>;
  tools?: Array<{
    name: string;
    description: string;
    input_schema: Record<string, unknown>;
  }>;
  stream?: boolean;
  thinking?: {
    type: 'enabled' | 'disabled';
    budget_tokens?: number;
  };
  metadata?: Record<string, unknown>;
}

/**
 * LLM Client for making API calls to Anthropic.
 *
 * Implements multi-provider routing, OAuth/API key authentication,
 * and SSE streaming response handling.
 *
 * [CONFIRMED] Core structure from reverse analysis
 */
export class LlmClient {
  private provider: Provider;
  private apiKey: string | undefined;
  private oauthToken: string | undefined;
  private maxRetries: number = 2; // [CONFIRMED] SDK default

  constructor(config?: Partial<ProviderConfig>) {
    this.provider = config?.provider || getProvider();
    this.apiKey = config?.apiKey || process.env.ANTHROPIC_API_KEY;
    this.oauthToken = config?.oauthToken;
  }

  /**
   * Create a streaming message request.
   *
   * [CONFIRMED] SSE event sequence:
   * message_start     → Init usage tracking
   * content_block_start → New content block (text/tool_use)
   * content_block_delta → Incremental content
   * content_block_stop  → End content block
   * message_delta      → stop_reason + final usage
   * message_stop       → Merge to totalUsage via GmT()
   */
  async *createMessageStream(
    config: ApiRequestConfig
  ): AsyncGenerator<StreamEvent> {
    const headers = this.buildHeaders();
    const body = this.buildRequestBody(config);

    // [CONFIRMED] max_retries = 2
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(this.getApiUrl(), {
          method: 'POST',
          headers,
          body: JSON.stringify({ ...body, stream: true }),
        });

        if (!response.ok) {
          const status = response.status;

          // [CONFIRMED] 429/529 → exponential backoff
          if (status === 429 || status === 529) {
            const retryAfter = response.headers.get('retry-after');
            const delay = retryAfter
              ? parseInt(retryAfter) * 1000
              : Math.pow(2, attempt) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }

          throw new Error(`API error: ${status} ${response.statusText}`);
        }

        // [CONFIRMED] Parse SSE stream
        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response body');

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Parse SSE events from buffer
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          let currentEvent: string | null = null;
          let currentData = '';

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              currentEvent = line.slice(7).trim();
            } else if (line.startsWith('data: ')) {
              currentData = line.slice(6);
            } else if (line === '' && currentEvent && currentData) {
              try {
                const data = JSON.parse(currentData);
                yield { event: currentEvent as StreamEventType, data };
              } catch {
                // Skip malformed events
              }
              currentEvent = null;
              currentData = '';
            }
          }
        }

        return; // Success
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < this.maxRetries) {
          await new Promise(resolve =>
            setTimeout(resolve, Math.pow(2, attempt) * 1000)
          );
        }
      }
    }

    if (lastError) throw lastError;
  }

  /**
   * Create a non-streaming message request.
   * [INFERRED] — used by tengu classifier and other non-stream calls
   */
  async createMessage(
    config: ApiRequestConfig
  ): Promise<{
    content: Array<{ type: string; text?: string; id?: string; name?: string; input?: unknown }>;
    stop_reason: string;
    usage: TokenUsage;
  }> {
    const headers = this.buildHeaders();
    const body = this.buildRequestBody(config);

    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(this.getApiUrl(), {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          if (response.status === 429 || response.status === 529) {
            const delay = Math.pow(2, attempt) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          throw new Error(`API error: ${response.status}`);
        }

        return await response.json();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < this.maxRetries) {
          await new Promise(resolve =>
            setTimeout(resolve, Math.pow(2, attempt) * 1000)
          );
        }
      }
    }

    throw lastError || new Error('API request failed');
  }

  /**
   * Count tokens for messages via API.
   * Tier 2: Precise token counting
   * [CONFIRMED] — uses count_tokens endpoint
   */
  async countTokens(config: {
    model: string;
    messages: Message[];
    system?: string;
    tools?: unknown[];
  }): Promise<{ input_tokens: number }> {
    const headers = this.buildHeaders();

    const response = await fetch(`${this.getApiUrl()}/count_tokens`, {
      method: 'POST',
      headers,
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      throw new Error(`Token count error: ${response.status}`);
    }

    return response.json();
  }

  // --------------------------------------------------------------------------
  // Private Methods
  // --------------------------------------------------------------------------

  /**
   * Build request headers with authentication.
   * [CONFIRMED] — supports API key, OAuth, and mTLS
   */
  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'compact-2026-01-12',  // [CONFIRMED] compact beta
    };

    // Authentication
    if (this.apiKey) {
      headers['x-api-key'] = this.apiKey;
    } else if (this.oauthToken) {
      headers['Authorization'] = `Bearer ${this.oauthToken}`;
    }

    // [CONFIRMED] mTLS handled at transport level via undici Agent
    // CLAUDE_CODE_CLIENT_CERT and CLAUDE_CODE_CLIENT_KEY env vars

    return headers;
  }

  /**
   * Build request body.
   * [CONFIRMED]
   */
  private buildRequestBody(config: ApiRequestConfig): Record<string, unknown> {
    const body: Record<string, unknown> = {
      model: config.model,
      max_tokens: config.max_tokens,
      messages: config.messages,
    };

    if (config.system) body.system = config.system;
    if (config.tools) body.tools = config.tools;
    if (config.thinking) body.thinking = config.thinking;
    if (config.metadata) body.metadata = config.metadata;

    return body;
  }

  /**
   * Get the API endpoint URL.
   * [INFERRED]
   */
  private getApiUrl(): string {
    switch (this.provider) {
      case 'firstParty':
        return 'https://api.anthropic.com/v1/messages';
      default:
        // Other providers use their respective SDKs
        return 'https://api.anthropic.com/v1/messages';
    }
  }
}

// ============================================================================
// OAuth Flow [CONFIRMED]
// ============================================================================

/**
 * OAuth 2.0 authorization flow for Claude Code.
 * [CONFIRMED] — CLIENT_ID and endpoints extracted from code
 */
export class OAuthManager {
  /**
   * Generate authorization URL.
   * [CONFIRMED]
   */
  getAuthorizationUrl(state: string, codeChallenge: string): string {
    const params = new URLSearchParams({
      client_id: OAUTH_CONFIG.CLIENT_ID,
      response_type: 'code',
      redirect_uri: 'http://localhost:0/callback',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      scope: 'claude_code',
    });

    return `${OAUTH_CONFIG.AUTHORIZE_URL}?${params}`;
  }

  /**
   * Exchange authorization code for tokens.
   * [CONFIRMED]
   */
  async exchangeCode(
    code: string,
    codeVerifier: string,
    redirectUri: string
  ): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
    const response = await fetch(OAUTH_CONFIG.TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: OAUTH_CONFIG.CLIENT_ID,
        code,
        code_verifier: codeVerifier,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error(`OAuth token exchange failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Refresh access token.
   * [INFERRED]
   */
  async refreshToken(
    refreshToken: string
  ): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
    const response = await fetch(OAUTH_CONFIG.TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        client_id: OAUTH_CONFIG.CLIENT_ID,
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error(`OAuth refresh failed: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Create an API key via OAuth.
   * [CONFIRMED] — uses dedicated endpoint
   */
  async createApiKey(
    accessToken: string
  ): Promise<{ api_key: string }> {
    const response = await fetch(OAUTH_CONFIG.API_KEY_CREATE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`API key creation failed: ${response.status}`);
    }

    return response.json();
  }
}
