/**
 * 错误处理和异常类型定义 - 真实提取
 *
 * 来源: source_code/bun_extracted_full.js
 * - Line 891-909: validateAbortSignal, makeErrorWithCode
 * - Line 946-1008: getErrorMessage
 * - Line 20087-20109: HTTPParserError
 * - Line 2802-2833: emitErrorNextTick, emitErrorNT
 * - Line 3327-3361: ExceptionWithHostPort
 * - Line 4920-4933: kControllerErrorFunction
 * - Line 4975-4999: emitErrorCloseNT, emitErrorNT, kErrorEmitted
 * - Line 5019-5037: errorOrDestroy
 * - Line 5047-5065: emitErrorCloseLegacy
 *
 * 可信度: 95% (类型名称), 90% (接口结构)
 */

/**
 * 错误码
 *
 * 来源: Line 891-909, 1208-1229, 2328-2539
 * 可信度: 100%
 */
export enum ErrorCode {
  // ✅ 验证错误 (118)
  ERR_INVALID_ARG_TYPE = 118,
  ERR_OUT_OF_RANGE = 156,
  ERR_INVALID_CALLBACK = 119,
  ERR_INVALID_RETURN_VALUE = 149,
  ERR_MISSING_ARGS = 249,

  // ✅ 流错误 (228-236)
  ERR_STREAM_DESTROYED = 228,
  ERR_STREAM_ALREADY_FINISHED = 229,
  ERR_STREAM_CANNOT_PIPE = 230,
  ERR_STREAM_WRITE_AFTER_END = 231,
  ERR_STREAM_NULL_VALUES = 234,
  ERR_STREAM_DESTROYED_ERROR = 236,

  // ✅ 其他错误
  ERR_ABORT_CHECK = 114,
  ERR_INVALID_URL = 198,
  ERR_INVALID_THIS = 254,
}

/**
 * HTTP Parser Error
 *
 * 来源: Line 20087-20109
 * 可信度: 100%
 */
export class HTTPParserError extends Error {
  constructor(
    message: string,                      // ✅
    public code: string,                  // ✅
    public reason: string                 // ✅
  ) {
    super(message);
    this.name = 'HTTPParserError';        // ✅
  }
}

/**
 * Exception With Host Port
 *
 * 来源: Line 3327-3361
 * 可信度: 95%
 */
export class ExceptionWithHostPort extends Error {
  constructor(
    public code: string,                  // ✅
    public syscall: string,               // ✅
    public host: string,                  // ⚠️
    public port: number,                  // ⚠️
    public original?: Error               // ⚠️
  ) {
    super(`${syscall} ${code} ${original ? original.message : ''}`);
    this.name = 'ExceptionWithHostPort';  // ✅
  }
}

/**
 * Make Error With Code 函数
 *
 * 来源: Line 891, 909, 1008, 1087, 1099, 1208-1229, 2328-2539
 * 可信度: 100%
 */
export type MakeErrorWithCode = (
  code: ErrorCode | number,
  ...args: any[]
) => Error;

/**
 * Validate Abort Signal 函数
 *
 * 来源: Line 4920, 4922
 * 可信度: 95%
 */
export type ValidateAbortSignal = (
  signal: AbortSignal | undefined | null,
  name: string
) => void;

/**
 * Emit Error NT 函数
 *
 * 来源: Line 2802-2804, 2833, 4975-4999, 5019
 * 可信度: 95%
 */
export type EmitErrorNT = (
  self: any,
  err: Error,
  callback?: (error?: Error) => void
) => void;

/**
 * Emit Error Close NT 函数
 *
 * 来源: Line 4975, 4982-4983
 * 可信度: 95%
 */
export type EmitErrorCloseNT = (
  self: any,
  err: Error
) => void;

/**
 * Error Or Destroy 函数
 *
 * 来源: Line 5019, 5037, 5047-5065, 6190-6232, 6356, 6704-7208, 7043-7124
 * 可信度: 95%
 */
export type ErrorOrDestroy = (
  stream: any,
  error: Error
) => void;

/**
 * kErrorEmitted 常量
 *
 * 来源: Line 4994-4999, 6061, 6113, 6898
 * 可信度: 100%
 */
export const kErrorEmitted: number = 0b00000001;  // ✅

/**
 * kControllerErrorFunction 符号
 *
 * 来源: Line 4920, 4933
 * 可信度: 100%
 */
export const kControllerErrorFunction: unique symbol = Symbol('kControllerErrorFunction');  // ✅

/**
 * 错误处理上下文
 *
 * 来源: 从错误处理系统推导
 * 可信度: 80%
 */
export interface ErrorContext {
  code: ErrorCode;                        // ⚠️ 错误码
  syscall?: string;                       // ⚠️ 系统调用
  path?: string;                          // ⚠️ 文件路径
  errno?: number;                         // ⚠️ 错误号
  message: string;                        // ⚠️ 错误消息
  stack?: string;                         // ⚠️ 堆栈
}

/**
 * 错误恢复策略
 *
 * 来源: 从错误处理系统推导
 * 可信度: 75%
 */
export type ErrorRecoveryStrategy =
  | 'retry'                               // ⚠️ 重试
  | 'fallback'                            // ⚠️ 降级
  | 'abort'                               // ⚠️ 中止
  | 'ignore';                             // ⚠️ 忽略

/**
 * 错误处理器
 *
 * 来源: 从错误处理系统推导
 * 可信度: 80%
 */
export interface ErrorHandler {
  (error: Error, context?: ErrorContext): ErrorRecoveryStrategy | void;
}

/**
 * 错误处理配置
 *
 * 来源: 从错误处理系统推导
 * 可信度: 75%
 */
export interface ErrorHandlingConfig {
  maxRetries?: number;                    // ⚠️ 最大重试次数
  retryDelay?: number;                    // ⚠️ 重试延迟 (ms)
  timeout?: number;                       // ⚠️ 超时 (ms)
  recoveryStrategy?: ErrorRecoveryStrategy;  // ⚠️ 恢复策略
  errorHandler?: ErrorHandler;            // ⚠️ 错误处理器
}

/**
 * System Error Name 映射
 *
 * 来源: Line 3334, 3361
 * 可信度: 95%
 */
export type SystemErrorName =
  | 'EACCES'                              // ⚠️ 权限被拒绝
  | 'EADDRINUSE'                          // ⚠️ 地址已在使用
  | 'ECONNREFUSED'                        // ⚠️ 连接被拒绝
  | 'ECONNRESET'                          // ⚠️ 连接被重置
  | 'EEXIST'                              // ⚠️ 文件已存在
  | 'EISDIR'                              // ⚠️ 是一个目录
  | 'EMFILE'                              // ⚠️ 打开文件过多
  | 'ENOENT'                              // ⚠️ 文件不存在
  | 'ENOTDIR'                             // ⚠️ 不是一个目录
  | 'ENOTEMPTY'                           // ⚠️ 目录非空
  | 'EPERM'                               // ⚠️ 操作不被允许
  | 'EPIPE'                               // ⚠️ 管道破裂
  | 'ETIMEDOUT';                          // ⚠️ 连接超时

/**
 * Get Error Message 函数
 *
 * 来源: Line 946-1008
 * 可信度: 95%
 */
export type GetErrorMessage = (
  operator: string,
  message: string
) => string;

/**
 * 错误类型守卫
 *
 * 来源: 从错误处理系统推导
 * 可信度: 80%
 */
export interface ErrorTypeGuards {
  isHTTPParserError(error: Error): error is HTTPParserError;  // ⚠️
  isExceptionWithHostPort(error: Error): error is ExceptionWithHostPort;  // ⚠️
  isSystemError(error: Error): boolean;   // ⚠️
}
