/**
 * Context Manager — Corrected to Server-Side Compaction
 *
 * Reverse-engineered from claude_code_agent.js v2.1.83
 *
 * CRITICAL CORRECTION:
 * The previous implementation was completely wrong. It implemented 5 fictional
 * client-side compression strategies (SLIDING_WINDOW, SMART_SUMMARY, etc.)
 * that DO NOT EXIST in the real Claude Code.
 *
 * The REAL architecture uses:
 * - Server-side compaction via Anthropic API "compact-2026-01-12" beta
 * - Client-side ONLY handles compact_boundary events by splicing messages
 * - Three-tier token counting (estimate / API / real)
 * - JSONL session persistence with compact-aware reading
 * - MCP output truncation at 25000 tokens
 *
 * Obfuscated name mapping:
 *   T4T      → readSessionFile (compact-aware JSONL reader)
 *   cO4      → isCompactBoundary (fast Buffer-based detection)
 *   GmT      → mergeUsageToTotal
 *   F8_      → accumulateUsage
 *   gD       → getTotalCostUsd
 *   gE       → getUsageByModel
 *
 * Source confidence:
 *   [CONFIRMED] — Directly extracted from minified code
 *   [INFERRED]  — Reconstructed from call sites
 */

import * as fs from 'fs';
import * as path from 'path';

import type { Message, TokenUsage } from '../agent/Agent';

// ============================================================================
// Constants [CONFIRMED]
// ============================================================================

/**
 * Default MCP output token limit.
 * Can be overridden via CLAUDE_CODE_MAX_MCP_OUTPUT_TOKENS env var.
 * [INFERRED]
 */
const DEFAULT_MAX_MCP_OUTPUT_TOKENS = 25000;

/**
 * Pre-check threshold multiplier (50% of limit for fast pass-through).
 * [INFERRED]
 */
const PRECHECK_MULTIPLIER = 0.5;

/**
 * Chars-per-token ratio for quick estimation.
 * [CONFIRMED] — code uses Math.ceil(text.length / 4)
 */
const CHARS_PER_TOKEN = 4;

/**
 * Fixed token estimate for images.
 * [CONFIRMED]
 */
const IMAGE_TOKEN_ESTIMATE = 1600;

/**
 * Compact boundary marker for fast detection.
 * [CONFIRMED] — used by cO4()
 */
const COMPACT_BOUNDARY_MARKER = 'compact_boundary';

/**
 * API beta header for server-side compaction.
 * [CONFIRMED] — from API request configuration
 */
export const COMPACT_BETA_HEADER = 'compact-2026-01-12';

// ============================================================================
// Token Estimation (Tier 1: Client-Side Quick Estimate) [CONFIRMED]
// ============================================================================

/**
 * Quick token estimate — client-side, low precision.
 *
 * [CONFIRMED] — code uses simple character count / 4
 * Used for: pre-checks, MCP output truncation fast path
 * Precision: LOW
 */
export function quickTokenEstimate(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Fixed token estimate for images.
 * [CONFIRMED] — always returns 1600
 */
export function imageTokenEstimate(): number {
  return IMAGE_TOKEN_ESTIMATE;
}

/**
 * Estimate tokens for a message (text + images).
 * [INFERRED]
 */
export function estimateMessageTokens(message: Message): number {
  if (typeof message.content === 'string') {
    return quickTokenEstimate(message.content);
  }

  let total = 0;
  for (const block of message.content) {
    if (block.type === 'text' && block.text) {
      total += quickTokenEstimate(block.text);
    } else if (block.type === 'image') {
      total += imageTokenEstimate();
    } else if (block.type === 'tool_result' && typeof block.content === 'string') {
      total += quickTokenEstimate(block.content);
    }
  }
  return total;
}

// ============================================================================
// MCP Output Truncation [INFERRED]
// ============================================================================

/**
 * Get the maximum MCP output tokens (from env or default).
 */
function getMaxMcpOutputTokens(): number {
  const envVal = process.env.CLAUDE_CODE_MAX_MCP_OUTPUT_TOKENS;
  if (envVal) {
    const parsed = parseInt(envVal, 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return DEFAULT_MAX_MCP_OUTPUT_TOKENS;
}

/**
 * Truncate MCP tool output if it exceeds the token limit.
 *
 * [INFERRED] — based on analysis:
 * - Pre-check: if estimate < limit * 0.5, pass through (12500 tokens)
 * - Character truncation: limit * 4 characters (100000 chars)
 */
export function truncateMcpOutput(output: string): string {
  const maxTokens = getMaxMcpOutputTokens();
  const precheckThreshold = maxTokens * PRECHECK_MULTIPLIER;

  // Fast path: if well under limit, pass through immediately
  if (quickTokenEstimate(output) < precheckThreshold) {
    return output;
  }

  // Character-level truncation
  const maxChars = maxTokens * CHARS_PER_TOKEN;
  if (output.length > maxChars) {
    return output.slice(0, maxChars) + '\n... [output truncated]';
  }

  return output;
}

// ============================================================================
// Server-Side Compaction Handling [CONFIRMED]
// ============================================================================

/**
 * Compact boundary metadata structure.
 * [CONFIRMED] — from event handling in submitMessage()
 */
export interface CompactMetadata {
  preservedSegment: {
    tailUuid: string;
  };
}

/**
 * Compact boundary event.
 * [CONFIRMED]
 */
export interface CompactBoundaryEvent {
  type: 'system';
  subtype: 'compact_boundary';
  compactMetadata: CompactMetadata;
}

/**
 * Process a compact_boundary event by truncating messages before the boundary.
 *
 * [CONFIRMED] — Real implementation:
 * 1. Check preservedSegment.tailUuid
 * 2. Find boundary index in mutableMessages
 * 3. splice(0, boundaryIndex) — remove all messages before boundary
 * 4. Set ZT.pendingPostCompaction = true
 *
 * This is the ONLY context management the client does.
 * All actual compression happens server-side via the compact-2026-01-12 API beta.
 */
export function handleCompactBoundary(
  messages: Message[],
  event: CompactBoundaryEvent
): {
  truncatedCount: number;
  remainingMessages: Message[];
} {
  const tailUuid = event.compactMetadata?.preservedSegment?.tailUuid;
  if (!tailUuid) {
    return { truncatedCount: 0, remainingMessages: messages };
  }

  const boundaryIndex = messages.findIndex(msg => msg.uuid === tailUuid);
  if (boundaryIndex < 0) {
    return { truncatedCount: 0, remainingMessages: messages };
  }

  // [CONFIRMED] Truncate all messages before boundary
  const truncatedCount = boundaryIndex;
  messages.splice(0, boundaryIndex);

  return { truncatedCount, remainingMessages: messages };
}

/**
 * Build API request headers with compact beta.
 * [CONFIRMED]
 */
export function getCompactHeaders(): Record<string, string> {
  return {
    'anthropic-beta': COMPACT_BETA_HEADER,
  };
}

// ============================================================================
// Prompt Caching [CONFIRMED]
// ============================================================================

/**
 * Apply cache control to system prompt blocks.
 *
 * [CONFIRMED] — System prompt is marked with cache_control: { type: "ephemeral" }
 */
export function applyCacheControl(
  systemPrompt: string
): Array<{ type: 'text'; text: string; cache_control: { type: 'ephemeral' } }> {
  return [{
    type: 'text',
    text: systemPrompt,
    cache_control: { type: 'ephemeral' },
  }];
}

/**
 * Track cache effectiveness from API response usage.
 * [CONFIRMED] — tracks cache_read_input_tokens and cache_creation_input_tokens
 */
export interface CacheStats {
  cacheReadTokens: number;
  cacheCreationTokens: number;
  cacheHitRate: number;
}

export function calculateCacheStats(usage: TokenUsage): CacheStats {
  const total = usage.cache_read_input_tokens + usage.cache_creation_input_tokens;
  return {
    cacheReadTokens: usage.cache_read_input_tokens,
    cacheCreationTokens: usage.cache_creation_input_tokens,
    cacheHitRate: total > 0 ? usage.cache_read_input_tokens / total : 0,
  };
}

// ============================================================================
// Session Persistence — JSONL Format [CONFIRMED]
// ============================================================================

/**
 * Write messages to JSONL session file.
 *
 * [CONFIRMED] — format is one JSON object per line
 * Path: ~/.claude/projects/<hash>/memory/
 */
export function writeSessionFile(filePath: string, messages: Message[]): void {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });

  const content = messages.map(msg => JSON.stringify(msg)).join('\n') + '\n';
  fs.writeFileSync(filePath, content, 'utf-8');
}

/**
 * Append a message to JSONL session file.
 * [INFERRED]
 */
export function appendToSessionFile(filePath: string, message: Message): void {
  fs.appendFileSync(filePath, JSON.stringify(message) + '\n', 'utf-8');
}

/**
 * Read messages from JSONL session file with compact-aware handling.
 *
 * Obfuscated: T4T()
 *
 * [CONFIRMED] — If file contains compact_boundary, discards everything before it.
 *
 * Implementation:
 * 1. Read all lines
 * 2. Scan from end to find last compact_boundary (cO4)
 * 3. If found, discard lines before it
 * 4. Parse remaining lines as JSON
 */
export function readSessionFile(filePath: string): Message[] {
  let content: string;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch {
    return []; // File doesn't exist
  }

  const lines = content.split('\n').filter(line => line.trim());

  // [CONFIRMED] Scan from end to find last compact_boundary
  let compactIndex = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (isCompactBoundary(lines[i])) {
      compactIndex = i;
      break;
    }
  }

  // [CONFIRMED] Discard everything before compact_boundary
  const relevantLines = compactIndex >= 0
    ? lines.slice(compactIndex + 1)
    : lines;

  // Parse JSON
  const messages: Message[] = [];
  for (const line of relevantLines) {
    try {
      messages.push(JSON.parse(line));
    } catch {
      // Skip malformed lines
    }
  }

  return messages;
}

/**
 * Fast compact_boundary detection.
 *
 * Obfuscated: cO4()
 *
 * [CONFIRMED] — Uses pre-compiled Buffer for fast string matching.
 * Avoids full JSON parse for each line.
 */
export function isCompactBoundary(line: string | Buffer): boolean {
  if (typeof line === 'string') {
    return line.includes(COMPACT_BOUNDARY_MARKER);
  }
  return line.includes(Buffer.from(COMPACT_BOUNDARY_MARKER));
}

// ============================================================================
// Session Path Resolution [INFERRED]
// ============================================================================

/**
 * Get the session storage directory.
 * [INFERRED] — ~/.claude/projects/<hash>/memory/
 */
export function getSessionDir(projectPath?: string): string {
  const home = process.env.HOME || process.env.USERPROFILE || '';
  if (!projectPath) {
    return path.join(home, '.claude', 'sessions');
  }

  // [INFERRED] Hash the project path for directory name
  const crypto = require('crypto');
  const hash = crypto.createHash('sha256').update(projectPath).digest('hex').slice(0, 16);
  return path.join(home, '.claude', 'projects', hash, 'memory');
}

// ============================================================================
// Context Manager Class
// ============================================================================

/**
 * Context manager that correctly implements server-side compaction.
 *
 * IMPORTANT: This class does NOT do client-side message compression.
 * The previous implementation with SLIDING_WINDOW, SMART_SUMMARY etc.
 * was entirely fictional. The real Claude Code uses server-side compaction
 * via the compact-2026-01-12 API beta.
 *
 * What this class actually does:
 * 1. Token estimation (quick client-side)
 * 2. MCP output truncation
 * 3. Compact boundary handling (from server events)
 * 4. System prompt caching
 * 5. JSONL session persistence
 */
export class ContextManager {
  private sessionDir: string;
  private totalUsage: TokenUsage = {
    input_tokens: 0,
    output_tokens: 0,
    cache_read_input_tokens: 0,
    cache_creation_input_tokens: 0,
  };

  constructor(projectPath?: string) {
    this.sessionDir = getSessionDir(projectPath);
  }

  /**
   * Get API headers for compact-enabled requests.
   * [CONFIRMED]
   */
  getHeaders(): Record<string, string> {
    return getCompactHeaders();
  }

  /**
   * Build cached system prompt blocks.
   * [CONFIRMED]
   */
  buildCachedSystemPrompt(
    systemPrompt: string
  ): Array<{ type: 'text'; text: string; cache_control: { type: 'ephemeral' } }> {
    return applyCacheControl(systemPrompt);
  }

  /**
   * Handle a compact_boundary event from the server.
   * [CONFIRMED] — the only context management the client does
   */
  handleCompaction(
    messages: Message[],
    event: CompactBoundaryEvent
  ): { truncatedCount: number } {
    return handleCompactBoundary(messages, event);
  }

  /**
   * Truncate MCP tool output if needed.
   * [INFERRED]
   */
  truncateMcpOutput(output: string): string {
    return truncateMcpOutput(output);
  }

  /**
   * Quick token estimate for a message.
   * [CONFIRMED]
   */
  estimateTokens(message: Message): number {
    return estimateMessageTokens(message);
  }

  /**
   * Update cumulative usage from API response.
   * Obfuscated: GmT() / F8_()
   * [CONFIRMED]
   */
  updateUsage(usage: Partial<TokenUsage>): void {
    if (usage.input_tokens) this.totalUsage.input_tokens += usage.input_tokens;
    if (usage.output_tokens) this.totalUsage.output_tokens += usage.output_tokens;
    if (usage.cache_read_input_tokens)
      this.totalUsage.cache_read_input_tokens += usage.cache_read_input_tokens;
    if (usage.cache_creation_input_tokens)
      this.totalUsage.cache_creation_input_tokens += usage.cache_creation_input_tokens;
  }

  /**
   * Get total usage.
   * [CONFIRMED]
   */
  getTotalUsage(): TokenUsage {
    return { ...this.totalUsage };
  }

  /**
   * Get cache statistics.
   * [CONFIRMED]
   */
  getCacheStats(): CacheStats {
    return calculateCacheStats(this.totalUsage);
  }

  /**
   * Save messages to session file.
   * [CONFIRMED]
   */
  saveSession(sessionId: string, messages: Message[]): void {
    const filePath = path.join(this.sessionDir, `${sessionId}.jsonl`);
    writeSessionFile(filePath, messages);
  }

  /**
   * Load messages from session file (compact-aware).
   * [CONFIRMED]
   */
  loadSession(sessionId: string): Message[] {
    const filePath = path.join(this.sessionDir, `${sessionId}.jsonl`);
    return readSessionFile(filePath);
  }
}
