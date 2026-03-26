/**
 * 压缩和加密类型定义 - 真实提取
 *
 * 来源: source_code/bun_extracted_full.js
 * - Line 19825-19831: Brotli, Zstd 压缩算法
 * - Line 7434-7464: TLS 验证函数
 * - Line 18155-18424: TLSSocket 实现
 * - Line 18260-18343: TLS 选项和常量
 * - Line 27917-27946: TLSOptions 字段
 *
 * 可信度: 95% (类型名称), 85% (接口结构)
 */

/**
 * 压缩算法类型
 *
 * 来源: Line 19825-19831
 * 可信度: 100%
 */
export type CompressionAlgorithm =
  | 'brotli'                               // ✅ BrotliCompress
  | 'zstd';                                // ✅ ZstdCompress

/**
 * Brotli 压缩选项
 *
 * 来源: Line 19825
 * 可信度: 85%
 */
export interface BrotliOptions {
  // ⚠️ 压缩质量 (0-11)
  quality?: number;                       // ⚠️

  // ⚠️ 窗口大小
  lgwin?: number;                         // ⚠️

  // ⚠️ 输入块大小
  lgblock?: number;                       // ⚠️

  // ⚠️ 模式
  mode?: 'generic' | 'text' | 'font';     // ⚠️
}

/**
 * Zstd 压缩选项
 *
 * 来源: Line 19829
 * 可信度: 85%
 */
export interface ZstdOptions {
  // ⚠️ 压缩级别 (1-22)
  level?: number;                         // ⚠️

  // ⚠️ 窗口大小
  windowLog?: number;                     // ⚠️

  // ⚠️ 工作内存
  workMem?: number;                       // ⚠️
}

/**
 * 压缩函数类型
 *
 * 来源: Line 19825-19831
 * 可信度: 100%
 */
export interface CompressionFunctions {
  // ✅ Brotli
  brotliCompressSync: (data: Buffer | string, options?: BrotliOptions) => Buffer;  // ✅
  brotliDecompressSync: (data: Buffer, options?: any) => Buffer;  // ✅

  // ✅ Zstd
  zstdCompressSync: (data: Buffer | string, options?: ZstdOptions) => Buffer;  // ✅
  zstdDecompressSync: (data: Buffer, options?: any) => Buffer;  // ✅
}

/**
 * TLS 验证函数
 *
 * 来源: Line 7434-7464
 * 可信度: 100%
 */
export interface TLSValidationFunctions {
  // ✅ 验证 TLS 项目
  isValidTLSItem(obj: any): boolean;      // ✅ Line 7434

  // ✅ 查找无效 TLS 项目
  findInvalidTLSItem(obj: any): any;      // ✅ Line 7442

  // ✅ 抛出无效 TLS 数组错误
  throwOnInvalidTLSArray(name: string, value: any): void;  // ✅ Line 7446

  // ✅ 验证 TLS 数组
  isValidTLSArray(obj: any): boolean;     // ✅ Line 7449
}

/**
 * TLS 选项
 *
 * 来源: Line 27917-27946, 18260-18343
 * 可信度: 95%
 */
export interface TLSOptions {
  // ✅ 密码和证书
  passphrase?: string;                    // ✅ Line 27919
  key?: string | Buffer | Array<string | Buffer | KeyObject>;  // ✅ Line 27931
  cert?: string | Buffer | Array<string | Buffer | KeyObject>;  // ✅ Line 27930
  ca?: string | Buffer | Array<string | Buffer>;  // ✅ Line 27929

  // ✅ 文件路径
  keyFile?: string;                       // ✅ Line 27934
  certFile?: string;                      // ✅ Line 27936
  caFile?: string;                        // ✅ Line 27938
  dhParamsFile?: string;                  // ✅ Line 27920

  // ✅ 服务器名称
  serverName?: string;                    // ✅ Line 27921

  // ✅ 安全选项
  secureOptions?: number;                 // ✅ Line 27932
  ciphers?: string;                       // ✅ Line 27942
  ALPNProtocols?: string[] | Buffer[];    // ✅ Line 27940

  // ✅ 授权和证书
  rejectUnauthorized?: boolean;           // ✅ Line 27926
  requestCert?: boolean;                  // ✅ Line 27927

  // ✅ 内存模式
  lowMemoryMode?: boolean;                // ✅ Line 27924

  // ✅ 重协商限制
  clientRenegotiationLimit?: number;      // ✅ Line 27944
  clientRenegotiationWindow?: number;     // ✅ Line 27946
}

/**
 * TLS 常量
 *
 * 来源: Line 18260-18261
 * 可信度: 100%
 */
export const TLS_CONSTANTS = {
  CLIENT_RENEG_LIMIT: 3,                  // ✅ Line 18260
  CLIENT_RENEG_WINDOW: 600,               // ✅ Line 18261
} as const;

/**
 * TLS Socket
 *
 * 来源: Line 18155-18245
 * 可信度: 95%
 */
export interface TLSSocket extends NetSocket {
  // ⚠️ TLS 属性
  authorized: boolean;                    // ⚠️
  authorizationError: Error | null;       // ⚠️

  // ✅ TLS 方法
  getSession(): Buffer;                   // ✅ Line 18170
  getEphemeralKeyInfo(): any;             // ✅ Line 18172
  getCipher(): any;                       // ✅ Line 18174
  getSharedSigalgs(): string[];           // ✅ Line 18176
  getProtocol(): string | null;           // ✅ Line 18178-18179
  getFinished(): Buffer | undefined;      // ✅ Line 18180-18181
  getPeerFinished(): Buffer | undefined;  // ✅ Line 18182-18183
  isSessionReused(): boolean;             // ✅ Line 18184-18186
  renegotiate(options?: any, callback?: () => void): boolean;  // ✅ Line 18188
  disableRenegotiation(): void;           // ✅ Line 18211
  getTLSTicket(): Buffer | undefined;     // ✅ Line 18213-18214
  exportKeyingMaterial(length: number, label: string, context?: Buffer): Buffer;  // ✅ Line 18215
  setMaxSendFragment(size: number): boolean;  // ✅ Line 18219
  enableTrace(): void;                    // ✅ Line 18221
  setServername(name: string): void;      // ✅ Line 18222
  setSession(session: Buffer | string): void;  // ✅ Line 18224
  getPeerCertificate(abbreviated?: boolean): any;  // ✅ Line 18230
  getCertificate(): any;                  // ✅ Line 18237
  getPeerX509Certificate(): any;          // ✅ Line 18239
  getX509Certificate(): any;              // ✅ Line 18241
}

/**
 * Key Object
 *
 * 来源: 从 TLS 系统推导
 * 可信度: 80%
 */
export interface KeyObject {
  type: 'private' | 'public' | 'secret';  // ⚠️
  asn1Curve?: string;                     // ⚠️
  pemCurve?: string;                      // ⚠️
  symmetricKeySize?: number;              // ⚠️
}

/**
 * TLS Connect Options
 *
 * 来源: Line 16119, 16176
 * 可信度: 90%
 */
export interface TLSConnectOptions extends TLSOptions {
  host?: string;                          // ⚠️
  port?: number;                          // ⚠️
  socket?: NetSocket;                     // ⚠️
  servername?: string;                    // ⚠️
  checkServerIdentity?: (host: string, cert: any) => Error | undefined;  // ⚠️
  session?: Buffer;                       // ⚠️
}

/**
 * TLS Server Options
 *
 * 来源: 从 TLS 系统推导
 * 可信度: 85%
 */
export interface TLSServerOptions extends TLSOptions {
  handshakeTimeout?: number;              // ⚠️
  requestCert?: boolean;                  // ✅
  rejectUnauthorized?: boolean;           // ✅
  NPNProtocols?: string[];                // ⚠️
  ALPNProtocols?: string[];               // ✅
  SNICallback?: (servername: string, cb: (err: Error | null, ctx?: any) => void) => void;  // ⚠️
}

/**
 * Valid TLS Error Message Types
 *
 * 来源: Line 7448
 * 可信度: 100%
 */
export type ValidTLSErrorMessageTypes =
  | string
  | Buffer
  | KeyObject;                            // ✅
