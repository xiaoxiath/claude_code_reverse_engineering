/**
 * Session Manager — 深度逆向重写 (2026-03-26)
 *
 * 基于 JSONL 持久化和 compact-aware 读取逻辑重写。
 *
 * 关键发现:
 * 1. 会话以 JSONL (每行一个 JSON 对象) 格式存储在 ~/.claude/projects/<hash>/session.jsonl
 * 2. 每条消息追加到文件末尾 (append-only)
 * 3. compact boundary 消息标记上下文压缩点
 * 4. 恢复会话时，从最后一个 compact boundary 开始读取
 * 5. 文件路径通过项目目录的 SHA-256 hash 确定
 *
 * byte-offset 参考:
 *   - JSONL 写入: offset 0x2D0000..0x2D0600 (函数 sW3)
 *   - JSONL 读取: offset 0x2D0600..0x2D0E00 (函数 sR7)
 *   - compact boundary: offset 0x2D1000..0x2D1400
 *   - session 路径: offset 0x2D1400..0x2D1800 (函数 sP_)
 *
 * 可信度: 80% (JSONL 格式和 compact 逻辑可信, 路径 hash 细节可能有偏差)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import type { InternalMessage, CompactMetadata } from '../types/state.types';

// ============================================================
// 类型定义
// ============================================================

/**
 * JSONL 行格式
 *
 * 每行是一个包含消息和元数据的 JSON 对象
 */
export interface JsonlEntry {
  /** 消息体 */
  message: InternalMessage;
  /** 版本号 (目前为 1) */
  version: number;
  /** 写入时间 */
  writtenAt: number;
}

/**
 * 会话加载结果
 */
export interface SessionLoadResult {
  /** 加载的消息列表 */
  messages: InternalMessage[];
  /** 会话 ID */
  sessionId: string;
  /** 是否从 compact boundary 恢复 */
  resumedFromCompact: boolean;
  /** 文件中的总消息数 */
  totalEntriesInFile: number;
  /** 实际加载的消息数 */
  loadedEntryCount: number;
}

/**
 * 会话配置
 */
export interface SessionManagerConfig {
  /** 会话存储根目录，默认 ~/.claude/projects */
  sessionsRoot: string;
  /** 是否启用持久化 */
  persistenceEnabled: boolean;
}

// ============================================================
// Session Manager 实现
// ============================================================

/**
 * SessionManager — JSONL 持久化会话管理器
 *
 * 混淆函数相关: sW3 (write), sR7 (read), sP_ (path)
 */
export class SessionManager {
  private config: SessionManagerConfig;
  private currentSessionId: string | null = null;
  private currentSessionPath: string | null = null;
  private messages: InternalMessage[] = [];
  private writeStream: fs.WriteStream | null = null;

  constructor(config: Partial<SessionManagerConfig> = {}) {
    this.config = {
      sessionsRoot: path.join(
        process.env.HOME || process.env.USERPROFILE || '~',
        '.claude',
        'projects'
      ),
      persistenceEnabled: true,
      ...config,
    };
  }

  // ============================================================
  // 会话生命周期
  // ============================================================

  /**
   * 创建新会话
   *
   * 逆向来源: Agent 初始化流程中的 session 创建
   *
   * @param projectDir 项目目录 (用于计算 hash)
   * @returns 会话 ID
   */
  createSession(projectDir: string): string {
    const sessionId = this.generateSessionId();
    const sessionPath = this.getSessionFilePath(projectDir, sessionId);

    // 确保目录存在
    const dir = path.dirname(sessionPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.currentSessionId = sessionId;
    this.currentSessionPath = sessionPath;
    this.messages = [];

    // 打开写入流 (append 模式)
    if (this.config.persistenceEnabled) {
      this.writeStream = fs.createWriteStream(sessionPath, { flags: 'a' });
    }

    return sessionId;
  }

  /**
   * 恢复已有会话
   *
   * 逆向来源: --resume 参数处理
   * byte-offset: 0x2D0600 (sR7)
   *
   * @param projectDir 项目目录
   * @param sessionId 要恢复的会话 ID
   */
  resumeSession(projectDir: string, sessionId: string): SessionLoadResult {
    const sessionPath = this.getSessionFilePath(projectDir, sessionId);

    if (!fs.existsSync(sessionPath)) {
      throw new Error(`Session file not found: ${sessionPath}`);
    }

    // 读取 JSONL 文件
    const result = this.readJsonlFile(sessionPath);

    this.currentSessionId = sessionId;
    this.currentSessionPath = sessionPath;
    this.messages = result.messages;

    // 打开写入流 (append 模式)
    if (this.config.persistenceEnabled) {
      this.writeStream = fs.createWriteStream(sessionPath, { flags: 'a' });
    }

    return result;
  }

  /**
   * 关闭当前会话
   */
  closeSession(): void {
    if (this.writeStream) {
      this.writeStream.end();
      this.writeStream = null;
    }
    this.currentSessionId = null;
    this.currentSessionPath = null;
    this.messages = [];
  }

  // ============================================================
  // 消息操作
  // ============================================================

  /**
   * 追加消息
   *
   * 逆向来源: sW3 函数
   * byte-offset: 0x2D0000
   *
   * 消息以 JSONL 格式追加到文件末尾。
   */
  appendMessage(message: InternalMessage): void {
    this.messages.push(message);

    // 持久化到 JSONL 文件
    if (this.writeStream && this.config.persistenceEnabled) {
      const entry: JsonlEntry = {
        message,
        version: 1,
        writtenAt: Date.now(),
      };
      this.writeStream.write(JSON.stringify(entry) + '\n');
    }
  }

  /**
   * 追加 compact boundary 消息
   *
   * 逆向来源: compact 流程完成后写入 boundary
   * byte-offset: 0x2D1000
   *
   * compact boundary 是一个特殊的 system 消息，标记上下文压缩点。
   * 恢复会话时，会从最后一个 compact boundary 开始读取。
   */
  appendCompactBoundary(metadata: CompactMetadata): void {
    const boundaryMessage: InternalMessage = {
      type: 'system',
      subtype: 'compact_boundary',
      uuid: this.generateUUID(),
      timestamp: Date.now(),
      compactMetadata: metadata,
    };

    this.appendMessage(boundaryMessage);
  }

  /**
   * 获取当前消息列表
   */
  getMessages(): InternalMessage[] {
    return [...this.messages];
  }

  /**
   * 获取消息数量
   */
  getMessageCount(): number {
    return this.messages.length;
  }

  // ============================================================
  // JSONL 文件读取 (compact-aware)
  // ============================================================

  /**
   * 读取 JSONL 文件 (compact-aware)
   *
   * 逆向来源: sR7 函数
   * byte-offset: 0x2D0600
   *
   * 关键逻辑:
   * 1. 逐行解析 JSONL
   * 2. 记录每个 compact_boundary 的位置
   * 3. 从最后一个 compact_boundary 开始返回消息
   * 4. 如果没有 compact_boundary, 返回全部消息
   */
  private readJsonlFile(filePath: string): SessionLoadResult {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const lines = fileContent.split('\n').filter(line => line.trim().length > 0);

    const allMessages: InternalMessage[] = [];
    let lastCompactIndex = -1;

    // 逐行解析
    for (let i = 0; i < lines.length; i++) {
      try {
        const entry = JSON.parse(lines[i]) as JsonlEntry;
        allMessages.push(entry.message);

        // 记录 compact boundary 位置
        if (
          entry.message.type === 'system' &&
          entry.message.subtype === 'compact_boundary'
        ) {
          lastCompactIndex = i;
        }
      } catch {
        // 跳过无法解析的行 (可能是损坏的数据)
        continue;
      }
    }

    // 从最后一个 compact boundary 开始
    let resultMessages: InternalMessage[];
    let resumedFromCompact = false;

    if (lastCompactIndex >= 0) {
      // 包含 compact boundary 本身和之后的所有消息
      resultMessages = allMessages.slice(lastCompactIndex);
      resumedFromCompact = true;
    } else {
      resultMessages = allMessages;
    }

    return {
      messages: resultMessages,
      sessionId: this.currentSessionId || '',
      resumedFromCompact,
      totalEntriesInFile: allMessages.length,
      loadedEntryCount: resultMessages.length,
    };
  }

  // ============================================================
  // 会话文件路径
  // ============================================================

  /**
   * 获取会话文件路径
   *
   * 逆向来源: sP_ 函数
   * byte-offset: 0x2D1400
   *
   * 路径格式: {sessionsRoot}/{projectHash}/{sessionId}.jsonl
   *
   * projectHash 是项目目录的 SHA-256 hash 的前 16 字符
   */
  private getSessionFilePath(projectDir: string, sessionId: string): string {
    const projectHash = crypto
      .createHash('sha256')
      .update(projectDir)
      .digest('hex')
      .slice(0, 16);

    return path.join(
      this.config.sessionsRoot,
      projectHash,
      `${sessionId}.jsonl`
    );
  }

  /**
   * 列出项目的所有会话
   */
  listSessions(projectDir: string): string[] {
    const projectHash = crypto
      .createHash('sha256')
      .update(projectDir)
      .digest('hex')
      .slice(0, 16);

    const sessionDir = path.join(this.config.sessionsRoot, projectHash);

    if (!fs.existsSync(sessionDir)) {
      return [];
    }

    return fs.readdirSync(sessionDir)
      .filter(f => f.endsWith('.jsonl'))
      .map(f => f.replace('.jsonl', ''))
      .sort();
  }

  // ============================================================
  // 辅助方法
  // ============================================================

  /**
   * 生成会话 ID
   *
   * 格式: 随机 UUID v4
   */
  private generateSessionId(): string {
    return this.generateUUID();
  }

  private generateUUID(): string {
    return crypto.randomUUID();
  }

  /** 当前会话 ID */
  get sessionId(): string | null {
    return this.currentSessionId;
  }

  /** 当前会话文件路径 */
  get sessionPath(): string | null {
    return this.currentSessionPath;
  }
}

// ============================================================
// 工厂函数
// ============================================================

export function createSessionManager(
  config?: Partial<SessionManagerConfig>
): SessionManager {
  return new SessionManager(config);
}
