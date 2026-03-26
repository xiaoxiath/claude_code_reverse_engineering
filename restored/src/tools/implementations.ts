// ============================================
// Read Tool - 文件读取工具
// ============================================

import { BaseTool } from './registry';
import { z } from 'zod';

/**
 * Read 工具参数 Schema
 */
const ReadSchema = z.object({
  file_path: z.string().describe('The absolute path to the file to read'),
  limit: z.number().optional().describe('The number of lines to read'),
  offset: z.number().optional().describe('The line number to start reading from')
});

type ReadParams = z.infer<typeof ReadSchema>;

/**
 * Read 工具
 * 使用 Bun File API 零拷贝读取文件
 */
export class ReadTool extends BaseTool {
  name = 'Read';
  description = 'Reads a file from the local filesystem';

  input_schema = {
    type: 'object' as const,
    properties: {
      file_path: {
        type: 'string',
        description: 'The absolute path to the file to read'
      },
      limit: {
        type: 'number',
        description: 'The number of lines to read'
      },
      offset: {
        type: 'number',
        description: 'The line number to start reading from'
      }
    },
    required: ['file_path']
  };

  async execute(params: ReadParams): Promise<string> {
    const { file_path, limit, offset = 0 } = params;

    // 验证路径
    this.validateFilePath(file_path);

    try {
      // 使用 Bun File API (零拷贝)
      const file = Bun.file(file_path);

      // 检查文件是否存在
      const exists = await file.exists();
      if (!exists) {
        throw new Error(`File not found: ${file_path}`);
      }

      // 读取文件内容
      const content = await file.text();

      // 如果没有 limit,返回全部内容
      if (!limit) {
        return this.formatWithLineNumbers(content);
      }

      // 分页读取
      const lines = content.split('\n');
      const selectedLines = lines.slice(offset, offset + limit);

      return this.formatWithLineNumbers(selectedLines.join('\n'), offset);

    } catch (error: any) {
      throw new Error(`Failed to read file: ${error.message}`);
    }
  }

  /**
   * 添加行号格式化
   */
  private formatWithLineNumbers(content: string, startLine: number = 0): string {
    const lines = content.split('\n');
    const maxLineNum = startLine + lines.length;
    const padding = maxLineNum.toString().length;

    return lines
      .map((line, idx) => {
        const lineNum = (startLine + idx + 1).toString().padStart(padding, ' ');
        return `${lineNum}→${line}`;
      })
      .join('\n');
  }
}

// ============================================
// Write Tool - 文件写入工具
// ============================================

import { z } from 'zod';

const WriteSchema = z.object({
  file_path: z.string().describe('The absolute path to the file to write'),
  content: z.string().describe('The content to write to the file')
});

type WriteParams = z.infer<typeof WriteSchema>;

export class WriteTool extends BaseTool {
  name = 'Write';
  description = 'Writes content to a file on the local filesystem';

  input_schema = {
    type: 'object' as const,
    properties: {
      file_path: {
        type: 'string',
        description: 'The absolute path to the file to write'
      },
      content: {
        type: 'string',
        description: 'The content to write to the file'
      }
    },
    required: ['file_path', 'content']
  };

  async execute(params: WriteParams): Promise<{ success: boolean; bytesWritten: number }> {
    const { file_path, content } = params;

    // 验证路径
    this.validateFilePath(file_path);

    try {
      // 使用 Bun.write (高效写入)
      const bytesWritten = await Bun.write(file_path, content);

      return {
        success: true,
        bytesWritten
      };

    } catch (error: any) {
      throw new Error(`Failed to write file: ${error.message}`);
    }
  }
}

// ============================================
// Edit Tool - 文件编辑工具 (Myers Diff)
// ============================================

import { z } from 'zod';
import { myersDiff, applyDiff } from '../utils/diff';

const EditSchema = z.object({
  file_path: z.string().describe('The absolute path to the file to edit'),
  old_string: z.string().describe('The text to replace'),
  new_string: z.string().describe('The text to replace it with'),
  replace_all: z.boolean().optional().describe('Replace all occurrences')
});

type EditParams = z.infer<typeof EditSchema>;

export class EditTool extends BaseTool {
  name = 'Edit';
  description = 'Performs exact string replacements in files';

  input_schema = {
    type: 'object' as const,
    properties: {
      file_path: {
        type: 'string',
        description: 'The absolute path to the file to edit'
      },
      old_string: {
        type: 'string',
        description: 'The text to replace'
      },
      new_string: {
        type: 'string',
        description: 'The text to replace it with'
      },
      replace_all: {
        type: 'boolean',
        description: 'Replace all occurrences'
      }
    },
    required: ['file_path', 'old_string', 'new_string']
  };

  async execute(params: EditParams): Promise<{ success: boolean; diff: string }> {
    const { file_path, old_string, new_string, replace_all } = params;

    // 验证路径
    this.validateFilePath(file_path);

    try {
      // 读取文件
      const file = Bun.file(file_path);
      const content = await file.text();

      // 检查 old_string 是否存在
      if (!content.includes(old_string)) {
        throw new Error('old_string not found in file');
      }

      let newContent: string;

      if (replace_all) {
        // 替换所有出现
        newContent = content.replaceAll(old_string, new_string);
      } else {
        // 精确替换 (只替换第一个)
        const index = content.indexOf(old_string);
        if (index === -1) {
          throw new Error('old_string not found in file');
        }

        newContent =
          content.slice(0, index) +
          new_string +
          content.slice(index + old_string.length);

        // 检查是否有多个匹配
        const remaining = content.slice(index + old_string.length);
        if (remaining.includes(old_string)) {
          console.warn(
            'WARNING: old_string appears multiple times in file. ' +
            'Only the first occurrence was replaced. ' +
            'Use replace_all=true to replace all occurrences.'
          );
        }
      }

      // 计算 diff
      const diff = myersDiff(content, newContent);

      // 写入文件
      await Bun.write(file_path, newContent);

      return {
        success: true,
        diff: this.formatDiff(diff)
      };

    } catch (error: any) {
      throw new Error(`Failed to edit file: ${error.message}`);
    }
  }

  /**
   * 格式化 diff 输出
   */
  private formatDiff(diff: any[]): string {
    return diff
      .map(d => {
        if (d.type === 'added') return `+ ${d.content}`;
        if (d.type === 'removed') return `- ${d.content}`;
        return `  ${d.content}`;
      })
      .join('\n');
  }
}

// ============================================
// Bash Tool - 命令执行工具
// ============================================

import { z } from 'zod';

const BashSchema = z.object({
  command: z.string().describe('The command to execute'),
  cwd: z.string().optional().describe('The working directory'),
  env: z.record(z.string()).optional().describe('Environment variables'),
  timeout: z.number().optional().describe('Timeout in milliseconds')
});

type BashParams = z.infer<typeof BashSchema>;

export class BashTool extends BaseTool {
  name = 'Bash';
  description = 'Executes a bash command';

  input_schema = {
    type: 'object' as const,
    properties: {
      command: {
        type: 'string',
        description: 'The command to execute'
      },
      cwd: {
        type: 'string',
        description: 'The working directory'
      },
      env: {
        type: 'object',
        description: 'Environment variables'
      },
      timeout: {
        type: 'number',
        description: 'Timeout in milliseconds'
      }
    },
    required: ['command']
  };

  async execute(params: BashParams): Promise<{
    exitCode: number;
    stdout: string;
    stderr: string;
  }> {
    const { command, cwd, env, timeout = 30000 } = params;

    try {
      // 使用 Bun.spawn 执行命令
      const proc = Bun.spawn(['sh', '-c', command], {
        cwd: cwd || process.cwd(),
        env: { ...process.env, ...env },
        stdout: 'pipe',
        stderr: 'pipe'
      });

      // 设置超时
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          proc.kill();
          reject(new Error(`Command timed out after ${timeout}ms`));
        }, timeout);
      });

      // 等待命令完成
      const [exitCode, stdout, stderr] = await Promise.race([
        Promise.all([
          proc.exited,
          new Response(proc.stdout).text(),
          new Response(proc.stderr).text()
        ]),
        timeoutPromise
      ]);

      return {
        exitCode,
        stdout,
        stderr
      };

    } catch (error: any) {
      throw new Error(`Failed to execute command: ${error.message}`);
    }
  }
}

// ============================================
// Glob Tool - 文件匹配工具
// ============================================

import { z } from 'zod';

const GlobSchema = z.object({
  pattern: z.string().describe('The glob pattern to match'),
  path: z.string().optional().describe('The directory to search in')
});

type GlobParams = z.infer<typeof GlobSchema>;

export class GlobTool extends BaseTool {
  name = 'Glob';
  description = 'Fast file pattern matching';

  input_schema = {
    type: 'object' as const,
    properties: {
      pattern: {
        type: 'string',
        description: 'The glob pattern to match (e.g., "**/*.ts")'
      },
      path: {
        type: 'string',
        description: 'The directory to search in (defaults to current directory)'
      }
    },
    required: ['pattern']
  };

  async execute(params: GlobParams): Promise<string[]> {
    const { pattern, path = '.' } = params;

    try {
      // 使用 Bun.Glob
      const glob = new Bun.Glob(pattern);
      const matches: string[] = [];

      for await (const match of glob.scan({ cwd: path })) {
        matches.push(match);
      }

      // 按修改时间排序 (最新的在前)
      const sorted = await this.sortByModifiedTime(matches, path);

      return sorted;

    } catch (error: any) {
      throw new Error(`Failed to execute glob: ${error.message}`);
    }
  }

  /**
   * 按修改时间排序
   */
  private async sortByModifiedTime(
    files: string[],
    basePath: string
  ): Promise<string[]> {
    const fileStats = await Promise.all(
      files.map(async file => {
        try {
          const filePath = require('path').join(basePath, file);
          const stat = await Bun.file(filePath).stat();
          return {
            file,
            mtime: stat?.mtime || new Date(0)
          };
        } catch {
          return {
            file,
            mtime: new Date(0)
          };
        }
      })
    );

    return fileStats
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
      .map(f => f.file);
  }
}

// ============================================
// Grep Tool - 代码搜索工具 (Ripgrep)
// ============================================

import { z } from 'zod';

const GrepSchema = z.object({
  pattern: z.string().describe('The regular expression pattern to search for'),
  path: z.string().optional().describe('File or directory to search in'),
  output_mode: z.enum(['content', 'files_with_matches', 'count']).optional(),
  glob: z.string().optional().describe('Glob pattern for file filtering'),
  type: z.string().optional().describe('File type to search'),
  multiline: z.boolean().optional().describe('Enable multiline mode')
});

type GrepParams = z.infer<typeof GrepSchema>;

export class GrepTool extends BaseTool {
  name = 'Grep';
  description = 'Fast content search using regular expressions';

  input_schema = {
    type: 'object' as const,
    properties: {
      pattern: {
        type: 'string',
        description: 'The regular expression pattern to search for'
      },
      path: {
        type: 'string',
        description: 'File or directory to search in'
      },
      output_mode: {
        type: 'string',
        enum: ['content', 'files_with_matches', 'count'],
        description: 'Output mode'
      },
      glob: {
        type: 'string',
        description: 'Glob pattern for file filtering'
      },
      type: {
        type: 'string',
        description: 'File type to search (e.g., "js", "py")'
      },
      multiline: {
        type: 'boolean',
        description: 'Enable multiline mode'
      }
    },
    required: ['pattern']
  };

  async execute(params: GrepParams): Promise<any> {
    const {
      pattern,
      path = '.',
      output_mode = 'content',
      glob,
      type,
      multiline
    } = params;

    try {
      // 构建 ripgrep 命令
      const args = ['rg', pattern, path];

      // 输出模式
      switch (output_mode) {
        case 'content':
          args.push('-n'); // 显示行号
          break;
        case 'files_with_matches':
          args.push('-l');
          break;
        case 'count':
          args.push('-c');
          break;
      }

      // 文件过滤
      if (glob) {
        args.push('--glob', glob);
      }

      if (type) {
        args.push('--type', type);
      }

      // 多行模式
      if (multiline) {
        args.push('--multiline');
      }

      // 执行 ripgrep (嵌入式二进制)
      const proc = Bun.spawn(args, {
        stdout: 'pipe',
        stderr: 'pipe'
      });

      const [exitCode, stdout, stderr] = await Promise.all([
        proc.exited,
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text()
      ]);

      // ripgrep 退出码: 0=找到, 1=未找到, 2=错误
      if (exitCode === 2) {
        throw new Error(stderr || 'Ripgrep error');
      }

      return this.parseOutput(stdout, output_mode);

    } catch (error: any) {
      throw new Error(`Failed to execute grep: ${error.message}`);
    }
  }

  /**
   * 解析输出
   */
  private parseOutput(output: string, mode: string): any {
    switch (mode) {
      case 'files_with_matches':
        return output.trim().split('\n').filter(Boolean);

      case 'count':
        const lines = output.trim().split('\n');
        return lines.map(line => {
          const [file, count] = line.split(':');
          return { file, count: parseInt(count, 10) };
        });

      case 'content':
      default:
        return output;
    }
  }
}
