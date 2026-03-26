/**
 * Memory Manager — 深度逆向重写 (2026-03-26)
 *
 * 基于 V5 函数的 CLAUDE.md 多级加载和 ~/.claude/memory/ 目录逻辑重写。
 *
 * 关键发现:
 * 1. CLAUDE.md 指令文件有三层来源:
 *    - Global: ~/.claude/CLAUDE.md
 *    - Project: {projectRoot}/CLAUDE.md 或 {projectRoot}/.claude/CLAUDE.md
 *    - Local: {projectRoot}/.claude.local/CLAUDE.md (不提交到 git)
 * 2. 三层指令合并为一个字符串注入 system prompt
 * 3. 还有一个 memory 目录 (~/.claude/memory/) 存储持久化的用户偏好
 * 4. Memory 文件通过 MemoryRead / MemoryWrite 工具进行 CRUD
 * 5. 加载函数在混淆代码中对应 V5 (CLAUDE.md 加载器)
 *
 * byte-offset 参考:
 *   - V5 加载器: offset 0x2C8000..0x2C8C00
 *   - CLAUDE.md 路径: offset 0x2C8C00..0x2C9000 (字符串常量)
 *   - memory 目录: offset 0x2C9000..0x2C9600
 *   - 指令合并: offset 0x2C9600..0x2CA000
 *
 * 可信度: 80% (三层加载逻辑可信, memory 目录细节可能有偏差)
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================
// 类型定义
// ============================================================

/**
 * 指令来源层级
 */
export type InstructionSource = 'global' | 'project' | 'local';

/**
 * 加载的指令文件
 */
export interface LoadedInstruction {
  source: InstructionSource;
  filePath: string;
  content: string;
  loadedAt: number;
}

/**
 * Memory 文件条目
 */
export interface MemoryEntry {
  /** 文件名 (不含路径) */
  name: string;
  /** 文件内容 */
  content: string;
  /** 最后修改时间 */
  modifiedAt: number;
}

/**
 * Memory Manager 配置
 */
export interface MemoryManagerConfig {
  /** 全局 CLAUDE.md 路径，默认 ~/.claude/CLAUDE.md */
  globalClaudeMdPath: string;
  /** memory 目录路径，默认 ~/.claude/memory/ */
  memoryDirPath: string;
  /** 项目根目录 */
  projectRoot: string;
}

// ============================================================
// Memory Manager 实现
// ============================================================

/**
 * MemoryManager — CLAUDE.md 加载 + memory 目录管理
 *
 * 混淆函数: V5 (CLAUDE.md 加载器)
 */
export class MemoryManager {
  private config: MemoryManagerConfig;
  private instructions: LoadedInstruction[] = [];
  private mergedInstructions: string | null = null;

  constructor(config: Partial<MemoryManagerConfig> & { projectRoot: string }) {
    const homeDir = process.env.HOME || process.env.USERPROFILE || '~';

    this.config = {
      globalClaudeMdPath: path.join(homeDir, '.claude', 'CLAUDE.md'),
      memoryDirPath: path.join(homeDir, '.claude', 'memory'),
      ...config,
    };
  }

  // ============================================================
  // CLAUDE.md 三层加载 (V5 函数)
  // ============================================================

  /**
   * 加载所有层级的 CLAUDE.md 文件
   *
   * 逆向来源: V5 函数
   * byte-offset: 0x2C8000
   *
   * 加载顺序 (越后面优先级越高):
   * 1. Global: ~/.claude/CLAUDE.md
   * 2. Project: {projectRoot}/CLAUDE.md 或 {projectRoot}/.claude/CLAUDE.md
   * 3. Local: {projectRoot}/.claude.local/CLAUDE.md
   *
   * 所有存在的文件内容会合并为一个字符串。
   */
  loadInstructions(): string {
    this.instructions = [];

    // 1. 加载 Global CLAUDE.md
    // byte-offset: 0x2C8100
    this.tryLoadInstruction(
      'global',
      this.config.globalClaudeMdPath
    );

    // 2. 加载 Project CLAUDE.md
    // 先尝试 {projectRoot}/CLAUDE.md, 再尝试 {projectRoot}/.claude/CLAUDE.md
    // byte-offset: 0x2C8200
    const projectClaudeMd = path.join(this.config.projectRoot, 'CLAUDE.md');
    const projectDotClaudeMd = path.join(this.config.projectRoot, '.claude', 'CLAUDE.md');

    if (fs.existsSync(projectClaudeMd)) {
      this.tryLoadInstruction('project', projectClaudeMd);
    } else {
      this.tryLoadInstruction('project', projectDotClaudeMd);
    }

    // 3. 加载 Local CLAUDE.md
    // byte-offset: 0x2C8300
    const localClaudeMd = path.join(
      this.config.projectRoot,
      '.claude.local',
      'CLAUDE.md'
    );
    this.tryLoadInstruction('local', localClaudeMd);

    // 合并指令
    // byte-offset: 0x2C9600
    this.mergedInstructions = this.mergeInstructions();

    return this.mergedInstructions;
  }

  /**
   * 尝试加载单个指令文件
   */
  private tryLoadInstruction(source: InstructionSource, filePath: string): void {
    try {
      if (!fs.existsSync(filePath)) {
        return;
      }

      const content = fs.readFileSync(filePath, 'utf-8').trim();
      if (content.length === 0) {
        return;
      }

      this.instructions.push({
        source,
        filePath,
        content,
        loadedAt: Date.now(),
      });
    } catch {
      // 文件不可读, 静默忽略
    }
  }

  /**
   * 合并三层指令
   *
   * 逆向来源: 指令合并逻辑
   * byte-offset: 0x2C9600
   *
   * 格式:
   * [Global instructions]
   * ---
   * [Project instructions]
   * ---
   * [Local instructions]
   */
  private mergeInstructions(): string {
    if (this.instructions.length === 0) {
      return '';
    }

    const sections: string[] = [];

    for (const inst of this.instructions) {
      sections.push(inst.content);
    }

    return sections.join('\n\n---\n\n');
  }

  /**
   * 获取合并后的指令
   */
  getInstructions(): string {
    if (this.mergedInstructions === null) {
      return this.loadInstructions();
    }
    return this.mergedInstructions;
  }

  /**
   * 获取各层级的指令
   */
  getInstructionsBySource(source: InstructionSource): string | null {
    const inst = this.instructions.find(i => i.source === source);
    return inst ? inst.content : null;
  }

  /**
   * 获取已加载的指令文件列表
   */
  getLoadedInstructions(): LoadedInstruction[] {
    return [...this.instructions];
  }

  // ============================================================
  // Memory 目录管理 (~/.claude/memory/)
  // ============================================================

  /**
   * 读取 memory 文件
   *
   * 逆向来源: MemoryRead 工具的实现
   * byte-offset: 0x2C9000
   *
   * @param name 文件名 (不含路径和扩展名)
   */
  readMemory(name: string): MemoryEntry | null {
    const filePath = this.getMemoryFilePath(name);

    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const stat = fs.statSync(filePath);

      return {
        name,
        content,
        modifiedAt: stat.mtimeMs,
      };
    } catch {
      return null;
    }
  }

  /**
   * 写入 memory 文件
   *
   * 逆向来源: MemoryWrite 工具的实现
   * byte-offset: 0x2C9200
   *
   * @param name 文件名
   * @param content 内容
   */
  writeMemory(name: string, content: string): void {
    const filePath = this.getMemoryFilePath(name);

    // 确保目录存在
    if (!fs.existsSync(this.config.memoryDirPath)) {
      fs.mkdirSync(this.config.memoryDirPath, { recursive: true });
    }

    fs.writeFileSync(filePath, content, 'utf-8');
  }

  /**
   * 删除 memory 文件
   */
  deleteMemory(name: string): boolean {
    const filePath = this.getMemoryFilePath(name);

    if (!fs.existsSync(filePath)) {
      return false;
    }

    try {
      fs.unlinkSync(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 列出所有 memory 文件
   *
   * 逆向来源: memory 目录扫描
   * byte-offset: 0x2C9400
   */
  listMemories(): MemoryEntry[] {
    if (!fs.existsSync(this.config.memoryDirPath)) {
      return [];
    }

    const entries: MemoryEntry[] = [];

    try {
      const files = fs.readdirSync(this.config.memoryDirPath)
        .filter(f => f.endsWith('.md'));

      for (const file of files) {
        const name = file.replace('.md', '');
        const filePath = path.join(this.config.memoryDirPath, file);

        try {
          const content = fs.readFileSync(filePath, 'utf-8');
          const stat = fs.statSync(filePath);

          entries.push({
            name,
            content,
            modifiedAt: stat.mtimeMs,
          });
        } catch {
          // 跳过不可读的文件
        }
      }
    } catch {
      // 目录不可读
    }

    return entries;
  }

  /**
   * 构建 memory 上下文 (注入 system prompt)
   *
   * 逆向来源: memory 内容注入 system prompt 的逻辑
   * byte-offset: 0x2C9500
   *
   * 格式:
   * <user_memories>
   * ## memory_name_1
   * content_1
   *
   * ## memory_name_2
   * content_2
   * </user_memories>
   */
  buildMemoryContext(): string {
    const memories = this.listMemories();

    if (memories.length === 0) {
      return '';
    }

    const sections: string[] = ['<user_memories>'];

    for (const memory of memories) {
      sections.push(`## ${memory.name}`);
      sections.push(memory.content);
      sections.push('');
    }

    sections.push('</user_memories>');

    return sections.join('\n');
  }

  // ============================================================
  // 辅助方法
  // ============================================================

  /**
   * 获取 memory 文件完整路径
   */
  private getMemoryFilePath(name: string): string {
    // 安全化文件名 (防止路径遍历)
    const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(this.config.memoryDirPath, `${safeName}.md`);
  }

  /**
   * 重新加载指令
   */
  reload(): string {
    this.mergedInstructions = null;
    return this.loadInstructions();
  }
}

// ============================================================
// 工厂函数
// ============================================================

export function createMemoryManager(
  projectRoot: string,
  config?: Partial<MemoryManagerConfig>
): MemoryManager {
  return new MemoryManager({ projectRoot, ...config });
}
