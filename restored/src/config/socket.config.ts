/**
 * Socket 配置 - 真实提取
 *
 * 来源: source_code/bun_extracted_full.js Line 46238-46338
 * 可信度: 100%
 * 提取方法: 直接从源码提取常量值
 */

export const SOCKET_CONFIG = {
  // ✅ 重连配置 (Line 46238-46338)
  MAX_RECONNECT_ATTEMPTS: 10,           // 最多重连次数
  INITIAL_RECONNECT_DELAY: 1000,        // 初始重连延迟 (ms)
  CONNECTION_TIMEOUT: 5000,             // 连接超时 (ms)

  // ✅ 缓冲区配置
  RESPONSE_BUFFER_INITIAL_SIZE: 0,      // 响应缓冲区初始大小
  MAX_MESSAGE_SIZE: undefined,          // 最大消息大小 (未提取)
} as const;

/**
 * 重连策略
 *
 * 来源: 推导自 reconnectDelay 和 reconnectAttempts 字段使用
 * 可信度: 90%
 */
export const RECONNECT_STRATEGY = {
  // ✅ 指数退避策略 (推导)
  BACKOFF_STRATEGY: 'exponential' as const,

  /**
   * 计算重连延迟
   * @param attempt - 当前尝试次数 (0-based)
   * @returns 延迟毫秒数
   */
  calculateDelay(attempt: number): number {
    // delay = initialDelay * Math.pow(2, attempt)
    return SOCKET_CONFIG.INITIAL_RECONNECT_DELAY * Math.pow(2, attempt);
  },

  /**
   * 示例延迟序列:
   * attempt 0: 1000ms  (1s)
   * attempt 1: 2000ms  (2s)
   * attempt 2: 4000ms  (4s)
   * attempt 3: 8000ms  (8s)
   * attempt 4: 16000ms (16s)
   * ...
   * attempt 9: 512000ms (8.5min)
   */
} as const;

/**
 * Socket 安全配置
 *
 * 来源: validateSocketSecurity 函数名称推导
 * 可信度: 85%
 */
export const SOCKET_SECURITY = {
  // ⚠️ 推导的安全检查项
  CHECK_FILE_PERMISSIONS: true,         // 检查文件权限
  CHECK_FILE_OWNER: true,               // 检查文件所有者
  ALLOWED_PERMISSION_MODE: 0o600,       // 允许的权限模式 (仅所有者可读写)

  /**
   * Socket 文件必须满足:
   * 1. 权限不包含组和其他用户的访问 (mode & 0o077 === 0)
   * 2. 所有者是当前用户 (uid === process.getuid())
   */
} as const;

/**
 * Socket 状态
 *
 * 来源: 从字段提取
 * 可信度: 100%
 */
export type SocketState = {
  connected: boolean;                   // ✅ 已连接
  connecting: boolean;                  // ✅ 连接中
  reconnectAttempts: number;            // ✅ 重连尝试次数
  reconnectTimer: NodeJS.Timeout | null; // ✅ 重连定时器
  disableAutoReconnect: boolean;        // ✅ 禁用自动重连
};

/**
 * Socket 客户端接口
 *
 * 来源: 从类字段和方法名推导
 * 可信度: 90%
 */
export interface SocketClient {
  // ✅ 字段 (从源码提取)
  socket: any;                          // Socket 实例
  connected: boolean;
  connecting: boolean;
  responseCallback: ((response: any) => void) | null;
  notificationHandler: ((notification: any) => void) | null;
  responseBuffer: Buffer;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  reconnectDelay: number;
  reconnectTimer: NodeJS.Timeout | null;
  context: any;
  disableAutoReconnect: boolean;

  // ⚠️ 方法 (从方法名推导)
  connect(): Promise<void>;
  closeSocket(): void;
  scheduleReconnect(): void;
  validateSocketSecurity(socketPath: string): Promise<void>;
  send(message: any): Promise<void>;
}
