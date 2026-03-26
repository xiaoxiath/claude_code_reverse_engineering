/**
 * 重连系统实现 - 基于真实提取的配置
 *
 * 来源: source_code/bun_extracted_full.js Line 46238-46338
 * 可信度: 配置 100%, 实现 70%
 */

import { SOCKET_CONFIG, RECONNECT_STRATEGY, SocketState } from '../config/socket.config';

/**
 * 重连管理器
 *
 * 实现基于真实提取的配置值
 */
export class ReconnectionManager implements SocketState {
  // ✅ 字段 (从源码提取)
  connected = false;
  connecting = false;
  reconnectAttempts = 0;
  reconnectTimer: NodeJS.Timeout | null = null;
  disableAutoReconnect = false;

  // ⚠️ 额外字段
  private logger: Console = console;
  private serverName: string;

  constructor(serverName: string) {
    this.serverName = serverName;
  }

  /**
   * 调度重连
   *
   * 策略: 指数退避 (基于真实配置)
   * 可信度: 90%
   */
  async scheduleReconnect(connectFn: () => Promise<void>): Promise<void> {
    // ✅ 检查最大重连次数 (真实值: 10)
    if (this.reconnectAttempts >= SOCKET_CONFIG.MAX_RECONNECT_ATTEMPTS) {
      this.logger.error(`[${this.serverName}] Max reconnect attempts (${SOCKET_CONFIG.MAX_RECONNECT_ATTEMPTS}) reached`);
      return;
    }

    // ✅ 检查是否禁用自动重连
    if (this.disableAutoReconnect) {
      this.logger.info(`[${this.serverName}] Auto reconnect disabled`);
      return;
    }

    // ✅ 计算延迟 (指数退避)
    const delay = RECONNECT_STRATEGY.calculateDelay(this.reconnectAttempts);
    this.reconnectAttempts++;

    this.logger.info(
      `[${this.serverName}] Scheduling reconnect attempt ${this.reconnectAttempts}/${SOCKET_CONFIG.MAX_RECONNECT_ATTEMPTS} in ${delay}ms`
    );

    // ✅ 设置定时器
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      await connectFn();
    }, delay);
  }

  /**
   * 重置重连状态
   *
   * 可信度: 95%
   */
  resetReconnectState(): void {
    this.reconnectAttempts = 0;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * 连接成功回调
   *
   * 可信度: 95%
   */
  onConnected(): void {
    this.connected = true;
    this.connecting = false;
    this.resetReconnectState();
    this.logger.info(`[${this.serverName}] Connected successfully`);
  }

  /**
   * 连接失败回调
   *
   * 可信度: 90%
   */
  onDisconnected(): void {
    this.connected = false;
    this.connecting = false;
    this.logger.info(`[${this.serverName}] Disconnected`);
  }

  /**
   * 开始连接
   *
   * 可信度: 90%
   */
  startConnecting(): void {
    this.connecting = true;
    this.connected = false;
  }

  /**
   * 禁用自动重连
   *
   * 可信度: 100%
   */
  disableReconnect(): void {
    this.disableAutoReconnect = true;
    this.resetReconnectState();
  }

  /**
   * 启用自动重连
   *
   * 可信度: 100%
   */
  enableReconnect(): void {
    this.disableAutoReconnect = false;
  }

  /**
   * 获取当前状态
   *
   * 可信度: 100%
   */
  getState(): SocketState {
    return {
      connected: this.connected,
      connecting: this.connecting,
      reconnectAttempts: this.reconnectAttempts,
      reconnectTimer: this.reconnectTimer,
      disableAutoReconnect: this.disableAutoReconnect,
    };
  }
}

/**
 * Socket 安全验证器
 *
 * 来源: validateSocketSecurity 函数名推导
 * 可信度: 85%
 */
export class SocketSecurityValidator {
  /**
   * 验证 Socket 文件安全性
   *
   * 检查项 (推导):
   * 1. 文件权限不包含组和其他用户的访问
   * 2. 文件所有者是当前用户
   *
   * 可信度: 85%
   */
  static async validateSocketSecurity(socketPath: string): Promise<void> {
    const fs = require('fs').promises;

    try {
      const stats = await fs.stat(socketPath);

      // ⚠️ 检查文件权限 (推导的逻辑)
      if (stats.mode & 0o077) {
        throw new Error(
          `Socket file has insecure permissions: ${(stats.mode & 0o777).toString(8)}. ` +
          `Expected 0600 or more restrictive.`
        );
      }

      // ⚠️ 检查文件所有者 (推导的逻辑)
      if (typeof process.getuid === 'function' && stats.uid !== process.getuid()) {
        throw new Error(
          `Socket file owned by different user (uid: ${stats.uid}, expected: ${process.getuid()})`
        );
      }
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(`Socket file not found: ${socketPath}`);
      }
      throw error;
    }
  }
}
