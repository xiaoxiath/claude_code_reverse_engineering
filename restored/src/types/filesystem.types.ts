/**
 * 文件系统和进程管理类型定义 - 真实提取
 *
 * 来源: source_code/bun_extracted_full.js
 * - Line 1992, 2079-2084: copyFileSync, makeFileWritable
 * - Line 2102: readdirSync, withFileTypes
 * - Line 2305, 2310: FileHandle
 * - Line 11350, 11371: ChildProcess, killSignal
 * - Line 11745, 11855: ChildProcess class, abortChildProcess
 * - Line 13651, 13686, 13718: FileHandle class
 * - Line 13810-13847: writeFileAsyncIterator
 * - Line 14119, 14131: withFileTypes
 * - Line 14148-14232: appendFileSync, copyFileSync, readFileSync, writeFileSync
 * - Line 19996: FileReader
 * - Line 27198: FileInternalReadableStreamSource
 * - Line 27878-27879: FileSink, ReadableFileSinkController
 *
 * 可信度: 95% (类型名称), 85% (接口结构)
 */

/**
 * File Handle (文件句柄)
 *
 * 来源: Line 13651, 13686, 13718
 * 可信度: 95%
 */
export interface FileHandle {
  fd: number;                             // ✅ 文件描述符
  flags: string;                          // ✅ 打开标志

  // ✅ 文件操作方法
  read(buffer: Buffer, offset: number, length: number, position: number): Promise<{ bytesRead: number; buffer: Buffer }>;  // ⚠️
  write(buffer: Buffer, offset: number, length: number, position: number): Promise<{ bytesWritten: number; buffer: Buffer }>;  // ⚠️
  close(): Promise<void>;                 // ⚠️
  stat(): Promise<Stats>;                 // ⚠️
}

/**
 * Stats (文件状态)
 *
 * 来源: 从 fs.stat 推导
 * 可信度: 90%
 */
export interface Stats {
  dev: number;                            // ⚠️ 设备 ID
  ino: number;                            // ⚠️ inode 号
  mode: number;                           // ✅ 文件模式
  nlink: number;                          // ⚠️ 硬链接数
  uid: number;                            // ✅ 用户 ID
  gid: number;                            // ✅ 组 ID
  rdev: number;                           // ⚠️ 设备 ID (特殊文件)
  size: number;                           // ⚠️ 文件大小
  blksize: number;                        // ⚠️ 块大小
  blocks: number;                         // ⚠️ 块数
  atime: Date;                            // ⚠️ 访问时间
  mtime: Date;                            // ⚠️ 修改时间
  ctime: Date;                            // ⚠️ 状态改变时间
  birthtime: Date;                        // ⚠️ 创建时间
}

/**
 * 文件系统选项
 *
 * 来源: Line 2102, 14119, 14131
 * 可信度: 95%
 */
export interface FileSystemOptions {
  encoding?: BufferEncoding;              // ✅ 编码
  withFileTypes?: boolean;                // ✅ Line 2102, 14119, 14131
  recursive?: boolean;                    // ⚠️ 递归
  mode?: number;                          // ✅ Line 2079
  preserveTimestamps?: boolean;           // ✅ Line 2079, 2215
  flag?: string;                          // ⚠️ 文件标志
}

/**
 * Dirent (目录项)
 *
 * 来源: Line 2102, withFileTypes
 * 可信度: 90%
 */
export interface Dirent {
  name: string;                           // ⚠️ 文件名
  isFile(): boolean;                      // ⚠️ 是否文件
  isDirectory(): boolean;                 // ⚠️ 是否目录
  isSymbolicLink(): boolean;              // ⚠️ 是否符号链接
  isBlockDevice(): boolean;               // ⚠️ 是否块设备
  isCharacterDevice(): boolean;           // ⚠️ 是否字符设备
  isFIFO(): boolean;                      // ⚠️ 是否 FIFO
  isSocket(): boolean;                    // ⚠️ 是否 Socket
}

/**
 * File Sink (文件接收器)
 *
 * 来源: Line 27878-27879, 2668, 2564, 2581, 2589, 2622, 2641, 2646
 * 可信度: 95%
 */
export interface FileSink {
  _getFd(): number;                       // ✅ 获取文件描述符
  write(chunk: any): Promise<void>;       // ⚠️ 写入
  flush(): Promise<void>;                 // ⚠️ 刷新
  close(): Promise<void>;                 // ⚠️ 关闭
}

/**
 * Readable File Sink Controller
 *
 * 来源: Line 27879
 * 可信度: 95%
 */
export interface ReadableFileSinkController {
  enqueue(chunk: any): void;              // ⚠️ 入队
  close(): void;                          // ⚠️ 关闭
  error(error?: any): void;               // ⚠️ 错误
}

/**
 * File Reader (Web API)
 *
 * 来源: Line 19996
 * 可信度: 95%
 */
export interface FileReader extends EventTarget {
  result: string | ArrayBuffer | null;    // ⚠️ 读取结果
  error: Error | null;                    // ⚠️ 错误
  readyState: number;                     // ⚠️ 就绪状态

  readAsArrayBuffer(blob: Blob): void;    // ⚠️ 读取为 ArrayBuffer
  readAsText(blob: Blob, encoding?: string): void;  // ⚠️ 读取为文本
  readAsDataURL(blob: Blob): void;        // ⚠️ 读取为 Data URL
  abort(): void;                          // ⚠️ 中止

  onload: ((event: Event) => void) | null;  // ⚠️ 加载完成
  onerror: ((event: Event) => void) | null;  // ⚠️ 错误
  onabort: ((event: Event) => void) | null;  // ⚠️ 中止
}

/**
 * Child Process (子进程)
 *
 * 来源: Line 11350, 11371, 11745, 11855
 * 可信度: 95%
 */
export interface ChildProcess extends EventEmitter {
  pid: number;                            // ✅ 进程 ID
  stdin: WritableStream | null;           // ⚠️ 标准输入
  stdout: ReadableStream | null;          // ⚠️ 标准输出
  stderr: ReadableStream | null;          // ⚠️ 标准错误
  exitCode: number | null;                // ⚠️ 退出码
  signalCode: string | null;              // ⚠️ 信号码
  killed: boolean;                        // ⚠️ 是否被杀死

  // ✅ 进程方法
  kill(signal?: string): boolean;         // ✅ Line 11350, 11855
  disconnect(): void;                     // ⚠️
  unref(): void;                          // ⚠️
  ref(): void;                            // ⚠️

  // ✅ 进程事件
  on(event: 'exit', listener: (code: number, signal: string) => void): this;  // ✅
  on(event: 'close', listener: (code: number, signal: string) => void): this;  // ✅
  on(event: 'error', listener: (err: Error) => void): this;  // ✅
}

/**
 * Exec File Options
 *
 * 来源: Line 11350, 11551, 11629
 * 可信度: 90%
 */
export interface ExecFileOptions {
  cwd?: string;                           // ⚠️ 工作目录
  env?: Record<string, string>;           // ⚠️ 环境变量
  encoding?: string;                      // ⚠️ 编码
  timeout?: number;                       // ⚠️ 超时 (ms)
  maxBuffer?: number;                     // ⚠️ 最大缓冲区
  killSignal?: string;                    // ✅ Line 11350
  uid?: number;                           // ⚠️ 用户 ID
  gid?: number;                           // ⚠️ 组 ID
  windowsHide?: boolean;                  // ⚠️ 隐藏窗口
  shell?: boolean | string;               // ⚠️ Shell
  signal?: AbortSignal;                   // ✅ Line 11371
}

/**
 * Abort Child Process 函数
 *
 * 来源: Line 11855
 * 可信度: 95%
 */
export type AbortChildProcess = (
  child: ChildProcess,
  killSignal: string,
  reason: any
) => void;

/**
 * Normalize Exec File Args 函数
 *
 * 来源: Line 11629
 * 可信度: 90%
 */
export type NormalizeExecFileArgs = (
  file: string,
  args?: string[],
  options?: ExecFileOptions,
  callback?: (error: Error | null, stdout: string | Buffer, stderr: string | Buffer) => void
) => {
  file: string;
  args?: string[];
  options?: ExecFileOptions;
  callback?: (error: Error | null, stdout: string | Buffer, stderr: string | Buffer) => void;
};

/**
 * 文件系统同步操作
 *
 * 来源: Line 14148-14232
 * 可信度: 100%
 */
export interface FileSystemSync {
  // ✅ Line 14158, 14271
  copyFileSync(src: string, dest: string, mode?: number): void;

  // ✅ Line 14199, 14310
  readFileSync(path: string, options?: FileSystemOptions): string | Buffer;

  // ✅ Line 14232, 14343
  writeFileSync(path: string, data: string | Buffer, options?: FileSystemOptions): void;

  // ✅ Line 14148, 14263
  appendFileSync(path: string, data: string | Buffer, options?: FileSystemOptions): void;
}

/**
 * Make File Writable 函数
 *
 * 来源: Line 2088, 2219
 * 可信度: 95%
 */
export type MakeFileWritable = (dest: string, srcMode: number) => void;

/**
 * Throw If Null Bytes In FileName 函数
 *
 * 来源: Line 14062
 * 可信度: 100%
 */
export type ThrowIfNullBytesInFileName = (filename: string) => void;
