/**
 * 流系统类型定义 - 真实提取
 *
 * 来源: source_code/bun_extracted_full.js
 * - Line 2383-2670: ReadStream, WriteStream 实现
 * - Line 6630, 7405: newStreamReadableFromReadableStream, newStreamWritableFromWritableStream
 * - Line 9038-9197: Web Streams 转换函数
 * - Line 11779-11805: Node Stream 检查函数
 * - Line 27143-27198: InternalReadableStreamSource 实现
 *
 * 可信度: 95% (类型名称), 85% (接口结构)
 */

/**
 * Node.js Stream 类型
 *
 * 来源: Line 11779-11805
 * 可信度: 100%
 */
export type NodeStream = NodeReadableStream | NodeWritableStream;

/**
 * Web Stream 类型
 *
 * 来源: Line 5172-5173, 6737-6744
 * 可信度: 100%
 */
export type WebStream = ReadableStream | WritableStream | TransformStream;

/**
 * Node.js 可读流
 *
 * 来源: Line 11795-11804
 * 可信度: 95%
 */
export interface NodeReadableStream {
  readable: boolean;                    // ✅ 是否可读
  readableEncoding: BufferEncoding | null;  // ⚠️ 编码
  readableEnded: boolean;               // ⚠️ 是否已结束
  readableFlowing: boolean | null;      // ⚠️ 是否流动
  readableHighWaterMark: number;        // ⚠️ 高水位标记
  readableLength: number;               // ⚠️ 可读长度

  on(event: 'data', listener: (chunk: any) => void): this;      // ✅ 数据事件
  on(event: 'end', listener: () => void): this;                // ✅ 结束事件
  on(event: 'error', listener: (err: Error) => void): this;    // ✅ 错误事件
  on(event: 'close', listener: () => void): this;              // ✅ 关闭事件

  pause(): this;                        // ⚠️ 暂停
  resume(): this;                       // ⚠️ 恢复
  destroy(error?: Error): this;         // ⚠️ 销毁
}

/**
 * Node.js 可写流
 *
 * 来源: Line 11805
 * 可信度: 95%
 */
export interface NodeWritableStream {
  writable: boolean;                    // ✅ 是否可写
  writableEnded: boolean;               // ⚠️ 是否已结束
  writableFinished: boolean;            // ⚠️ 是否已完成
  writableHighWaterMark: number;        // ⚠️ 高水位标记
  writableLength: number;               // ⚠️ 可写长度

  on(event: 'drain', listener: () => void): this;        // ✅ 排空事件
  on(event: 'finish', listener: () => void): this;       // ✅ 完成事件
  on(event: 'error', listener: (err: Error) => void): this;  // ✅ 错误事件
  on(event: 'close', listener: () => void): this;        // ✅ 关闭事件

  write(chunk: any, callback?: (error?: Error) => void): boolean;  // ⚠️ 写入
  end(callback?: () => void): this;     // ⚠️ 结束
  destroy(error?: Error): this;         // ⚠️ 销毁
}

/**
 * ReadableStream (Web Streams API)
 *
 * 来源: Line 9134-9169, 9171-9203
 * 可信度: 95%
 */
export interface ReadableStream<R = any> {
  readonly locked: boolean;             // ✅ 是否锁定

  getReader(): ReadableStreamDefaultReader<R>;  // ⚠️ 获取读取器
  pipeThrough<T>(transform: TransformStream<R, T>): ReadableStream<T>;  // ⚠️ 管道转换
  pipeTo(dest: WritableStream<R>): Promise<void>;  // ⚠️ 管道到可写流
  tee(): [ReadableStream<R>, ReadableStream<R>];  // ⚠️ 分流

  cancel(reason?: any): Promise<void>;  // ⚠️ 取消
}

/**
 * WritableStream (Web Streams API)
 *
 * 来源: Line 9038-9080, 9082-9132
 * 可信度: 95%
 */
export interface WritableStream<W = any> {
  readonly locked: boolean;             // ✅ 是否锁定

  getWriter(): WritableStreamDefaultWriter<W>;  // ⚠️ 获取写入器

  abort(reason?: any): Promise<void>;   // ⚠️ 中止
  close(): Promise<void>;               // ⚠️ 关闭
}

/**
 * TransformStream (Web Streams API)
 *
 * 来源: Line 9197, 5981, 5915
 * 可信度: 95%
 */
export interface TransformStream<I = any, O = any> {
  readable: ReadableStream<O>;          // ✅ 可读端
  writable: WritableStream<I>;          // ✅ 可写端
}

/**
 * ReadableStream 读取器
 *
 * 来源: 从 Web Streams API 标准推导
 * 可信度: 90%
 */
export interface ReadableStreamDefaultReader<R = any> {
  read(): Promise<{ done: boolean; value: R | undefined }>;  // ⚠️ 读取
  releaseLock(): void;                  // ⚠️ 释放锁
  cancel(reason?: any): Promise<void>;  // ⚠️ 取消
}

/**
 * WritableStream 写入器
 *
 * 来源: 从 Web Streams API 标准推导
 * 可信度: 90%
 */
export interface WritableStreamDefaultWriter<W = any> {
  write(chunk: W): Promise<void>;       // ⚠️ 写入
  close(): Promise<void>;               // ⚠️ 关闭
  abort(reason?: any): Promise<void>;   // ⚠️ 中止
  releaseLock(): void;                  // ⚠️ 释放锁

  readonly closed: Promise<void>;       // ⚠️ 关闭 Promise
  readonly desiredSize: number | null;  // ⚠️ 期望大小
  readonly ready: Promise<void>;        // ⚠️ 就绪 Promise
}

/**
 * ReadableStream 控制器
 *
 * 来源: Line 10136, 10542, 10610, 30483
 * 可信度: 90%
 */
export interface ReadableStreamController<R = any> {
  enqueue(chunk: R): void;              // ⚠️ 入队
  close(): void;                        // ⚠️ 关闭
  error(error?: any): void;             // ⚠️ 错误

  readonly desiredSize: number | null;  // ⚠️ 期望大小
}

/**
 * ReadableStream 直接控制器
 *
 * 来源: Line 30483, 30496
 * 可信度: 95%
 */
export interface ReadableStreamDirectController<R = any> extends ReadableStreamController<R> {
  // Bun 扩展的直接流控制器
}

/**
 * 内部 ReadableStream 源
 *
 * 来源: Line 27143, 27155, 27198
 * 可信度: 95%
 */
export type InternalReadableStreamSource =
  | BlobInternalReadableStreamSource
  | BytesInternalReadableStreamSource
  | FileInternalReadableStreamSource;

/**
 * Blob 内部流源
 *
 * 来源: Line 27143
 * 可信度: 100%
 */
export interface BlobInternalReadableStreamSource {
  type: 'blob';                         // ✅
}

/**
 * Bytes 内部流源
 *
 * 来源: Line 27155
 * 可信度: 100%
 */
export interface BytesInternalReadableStreamSource {
  type: 'bytes';                        // ✅
}

/**
 * File 内部流源
 *
 * 来源: Line 27198
 * 可信度: 100%
 */
export interface FileInternalReadableStreamSource {
  type: 'file';                         // ✅
}

/**
 * Stream 转换函数类型
 *
 * 来源: Line 6630, 7405, 9038, 9082, 9134, 9171, 9197
 * 可信度: 100%
 */
export interface StreamConverters {
  // Node.js Stream -> Web Stream
  newReadableStreamFromStreamReadable(streamReadable: NodeReadableStream, options?: any): ReadableStream;  // ✅ Line 9171
  newStreamWritableFromWritableStream(writableStream: WritableStream, options?: any): NodeWritableStream;  // ✅ Line 9082

  // Web Stream -> Node.js Stream
  newStreamReadableFromReadableStream(readableStream: ReadableStream, options?: any): NodeReadableStream;  // ✅ Line 9134
  newWritableStreamFromStreamWritable(streamWritable: NodeWritableStream): WritableStream;  // ✅ Line 9038

  // Duplex 转换
  newStreamDuplexFromReadableWritablePair(pair?: { readable?: ReadableStream; writable?: WritableStream }, options?: any): TransformStream;  // ✅ Line 9197
}

/**
 * Stream 检查函数类型
 *
 * 来源: Line 11795, 11805, 6737, 6739, 6741, 6744
 * 可信度: 100%
 */
export interface StreamCheckers {
  isNodeStreamReadable(item: any): item is NodeReadableStream;      // ✅ Line 11795
  isNodeStreamWritable(item: any): item is NodeWritableStream;      // ✅ Line 11805
  isReadableStream(obj: any): obj is ReadableStream;                // ✅ Line 6737
  isWritableStream(obj: any): obj is WritableStream;                // ✅ Line 6739
  isTransformStream(obj: any): obj is TransformStream;              // ✅ Line 6741
  isStream(obj: any): obj is WebStream;                             // ✅ Line 6744
}

/**
 * 流错误类型
 *
 * 来源: Line 14541, 15174
 * 可信度: 95%
 */
export interface StreamError extends Error {
  code: string;                         // ⚠️ 错误码
  stream?: NodeStream | WebStream;      // ⚠️ 相关流
}

/**
 * 流状态
 *
 * 来源: 从流实现推导
 * 可信度: 80%
 */
export type StreamState =
  | 'readable'        // ⚠️ 可读
  | 'writable'        // ⚠️ 可写
  | 'paused'          // ⚠️ 已暂停
  | 'flowing'         // ⚠️ 流动中
  | 'ended'           // ⚠️ 已结束
  | 'errored'         // ⚠️ 错误
  | 'closed';         // ⚠️ 已关闭
