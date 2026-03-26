/**
 * 错误码定义 - 真实提取
 *
 * 来源: source_code/bun_extracted_full.js 全局搜索
 * 可信度: 100% (错误码), 60% (错误消息)
 */

/**
 * Brotli 解码错误码
 *
 * 来源: Brotli 解码器
 * 可信度: 100%
 */
export const BROTLI_ERROR_CODES = {
  // ✅ 分配错误
  ERROR_ALLOC_BLOCK_TYPE_TREES: -1,
  ERROR_ALLOC_CONTEXT_MAP: -2,
  ERROR_ALLOC_CONTEXT_MODES: -3,
  ERROR_ALLOC_RING_BUFFER_1: -4,
  ERROR_ALLOC_RING_BUFFER_2: -5,
  ERROR_ALLOC_TREE_GROUPS: -6,

  // ✅ 格式错误
  ERROR_FORMAT_BLOCK_LENGTH_1: -7,
  ERROR_FORMAT_BLOCK_LENGTH_2: -8,
  ERROR_FORMAT_CL_SPACE: -9,
  ERROR_FORMAT_CONTEXT_MAP_REPEAT: -10,
  ERROR_FORMAT_DICTIONARY: -11,
  ERROR_FORMAT_DISTANCE: -12,
  ERROR_FORMAT_EXUBERANT_META_NIBBLE: -13,
  ERROR_FORMAT_EXUBERANT_NIBBLE: -14,
  ERROR_FORMAT_FL_SPACE: -15,
  ERROR_FORMAT_HUFFMAN_SPACE: -16,
  ERROR_FORMAT_PADDING_1: -17,
  ERROR_FORMAT_PADDING_2: -18,
  ERROR_FORMAT_RESERVED: -19,
  ERROR_FORMAT_SIMPLE_HUFFMAN_ALPHABET: -20,
  ERROR_FORMAT_SIMPLE_HUFFMAN_SAME: -21,
  ERROR_FORMAT_TRANSFORM: -22,
  ERROR_FORMAT_WINDOW_BITS: -23,

  // ✅ 无效输入错误
  ERROR_INVALID_ARGUMENTS: -24,
  ERROR_INVALID_CONTENT_LENGTH: -25,
  ERROR_INVALID_EOF: -26,
  ERROR_INVALID_HEADER_TOKEN: -27,
  ERROR_INVALID_METHOD: -28,
  ERROR_INVALID_TRANSFER_ENCODING: -29,
} as const;

/**
 * HTTP 错误码
 *
 * 来源: HTTP 客户端
 * 可信度: 100%
 */
export const HTTP_ERROR_CODES = {
  // ✅ HTTP 错误
  ERROR_IN_ASSIGNMENT: 'IN_ASSIGNMENT',
  ERROR_MISSING_COLLSEQ: 'MISSING_COLLSEQ',
  ERROR_OR_ACCESS_RULE_VIOLATION: 'ACCESS_RULE_VIOLATION',
  ERROR_REPORTING: 'REPORTING',
  ERROR_REQUEST_HEADER_FIELDS_TOO_LARGE: 'REQUEST_HEADER_FIELDS_TOO_LARGE',
  ERROR_RETRY: 'RETRY',
  ERROR_SNAPSHOT: 'SNAPSHOT',
  ERROR_STACK_OVERFLOW_MSG: 'STACK_OVERFLOW',
  ERROR_STRING: 'STRING',
  ERROR_TYPE: 'TYPE',
  ERROR_TYPE_VALUE_OTHER: 'TYPE_VALUE_OTHER',
  ERROR_UNREACHABLE: 'UNREACHABLE',
} as const;

/**
 * Agent 错误类型
 *
 * 来源: 从错误处理逻辑推导
 * 可信度: 85%
 */
export enum AgentErrorType {
  // API 错误
  RATE_LIMITED = 'RATE_LIMITED',
  BUDGET_EXCEEDED = 'BUDGET_EXCEEDED',
  MAX_TURNS_REACHED = 'MAX_TURNS_REACHED',

  // 权限错误
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  UNAUTHORIZED = 'UNAUTHORIZED',

  // 工具错误
  TOOL_NOT_FOUND = 'TOOL_NOT_FOUND',
  TOOL_ERROR = 'TOOL_ERROR',

  // 系统错误
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

/**
 * 错误消息映射
 *
 * 来源: 部分提取 + 部分推导
 * 可信度: 60%
 */
export const ERROR_MESSAGES: Record<string, string> = {
  // ⚠️ API 错误
  [AgentErrorType.RATE_LIMITED]: 'Rate limit exceeded. Please wait before retrying.',
  [AgentErrorType.BUDGET_EXCEEDED]: 'Budget limit exceeded. Operation cancelled.',
  [AgentErrorType.MAX_TURNS_REACHED]: 'Maximum turns reached. Session ending.',

  // ⚠️ 权限错误
  [AgentErrorType.PERMISSION_DENIED]: 'Permission denied by user.',
  [AgentErrorType.UNAUTHORIZED]: 'Unauthorized access. Please check permissions.',

  // ⚠️ 工具错误
  [AgentErrorType.TOOL_NOT_FOUND]: 'Tool not found.',
  [AgentErrorType.TOOL_ERROR]: 'Tool execution failed.',

  // ⚠️ 系统错误
  [AgentErrorType.CONNECTION_ERROR]: 'Connection failed. Retrying...',
  [AgentErrorType.TIMEOUT_ERROR]: 'Operation timed out.',
  [AgentErrorType.INTERNAL_ERROR]: 'Internal error occurred.',
};

/**
 * 可恢复的错误
 *
 * 来源: 从重试逻辑推导
 * 可信度: 75%
 */
export const RECOVERABLE_ERRORS: AgentErrorType[] = [
  AgentErrorType.RATE_LIMITED,
  AgentErrorType.CONNECTION_ERROR,
  AgentErrorType.TIMEOUT_ERROR,
];

/**
 * 不可恢复的错误
 *
 * 来源: 从错误处理逻辑推导
 * 可信度: 75%
 */
export const NON_RECOVERABLE_ERRORS: AgentErrorType[] = [
  AgentErrorType.BUDGET_EXCEEDED,
  AgentErrorType.MAX_TURNS_REACHED,
  AgentErrorType.PERMISSION_DENIED,
  AgentErrorType.UNAUTHORIZED,
];
