/**
 * WebSocket 和 HTTP/2 类型定义 - 真实提取
 *
 * 来源: source_code/bun_extracted_full.js
 * - Line 20492-20522: BunWebSocketMocked, WebSocketServer
 * - Line 20625-20647: WebSocket 握手和流
 * - Line 14514-15560: HTTP/2 完整实现
 * - Line 14637-14702: Http2ServerRequest, Http2ServerResponse
 * - Line 14902-15009: Http2Session, Http2Stream
 * - Line 15085-15388: ServerHttp2Stream, ClientHttp2Session
 *
 * 可信度: 90% (类型名称), 85% (接口结构)
 */

/**
 * WebSocket Mocked (Bun 实现)
 *
 * 来源: Line 20492-20522
 * 可信度: 95%
 */
export interface BunWebSocketMocked extends EventEmitter {
  url: string;                            // ✅
  protocol: string;                       // ✅
  extensions: string;                     // ✅
  binaryType: string;                     // ⚠️ "nodebuffer"

  on(event: 'open', listener: () => void): this;
  on(event: 'close', listener: (code: number, reason: string) => void): this;
  on(event: 'error', listener: (error: Error) => void): this;
  on(event: 'message', listener: (data: any) => void): this;

  send(data: any, callback?: (error?: Error) => void): void;  // ⚠️
  close(code?: number, reason?: string): void;  // ⚠️
  terminate(): void;                      // ⚠️
}

/**
 * WebSocket Server
 *
 * 来源: Line 20522-20647
 * 可信度: 95%
 */
export interface WebSocketServer extends EventEmitter {
  // ⚠️ Server 方法
  close(callback?: () => void): void;     // ⚠️
  handleUpgrade(request: any, socket: any, head: any, callback: (ws: any) => void): void;  // ⚠️

  // ⚠️ Server 事件
  on(event: 'connection', listener: (ws: any, request: any) => void): this;
  on(event: 'error', listener: (error: Error) => void): this;
  on(event: 'close', listener: () => void): this;
}

/**
 * WebSocket 握手响应
 *
 * 来源: Line 20625
 * 可信度: 100%
 */
export interface WebSocketHandshakeResponse {
  status: 101;                            // ✅
  statusText: 'Switching Protocols';      // ✅
  headers: {
    'Upgrade': 'websocket';               // ✅
    'Connection': 'Upgrade';              // ✅
    'Sec-WebSocket-Accept': string;       // ✅
    'Sec-WebSocket-Protocol'?: string;    // ⚠️
  };
}

/**
 * HTTP/2 Session
 *
 * 来源: Line 14902-14946
 * 可信度: 95%
 */
export interface Http2Session extends EventEmitter {
  // ✅ Session 属性
  [bunHTTP2Socket]: any;                  // ✅
  [bunHTTP2OriginSet]?: Set<string>;      // ✅

  // ⚠️ Session 方法
  bufferSize(): number;                   // ⚠️
  destroy(error?: Error): void;           // ⚠️
  close(callback?: () => void): void;     // ⚠️

  // ⚠️ Session 事件
  on(event: 'close', listener: () => void): this;
  on(event: 'error', listener: (error: Error) => void): this;
  on(event: 'connect', listener: () => void): this;
}

/**
 * HTTP/2 Stream
 *
 * 来源: Line 14946-15009
 * 可信度: 95%
 */
export interface Http2Stream extends Duplex {
  // ✅ Stream 属性
  [bunHTTP2Session]: Http2Session | null;  // ✅
  [bunHTTP2StreamFinal]: (() => void) | null;  // ✅
  [bunHTTP2StreamStatus]: number;         // ✅ (位标志)
  [bunHTTP2Headers]: any;                 // ✅

  // ⚠️ Stream 属性
  id: number;                             // ⚠️ Stream ID
  state: Http2StreamState;                // ⚠️
  ended: boolean;                         // ⚠️

  // ⚠️ Stream 方法
  close(code?: number, callback?: () => void): void;  // ⚠️
  sendTrailers(headers: any): void;       // ⚠️
}

/**
 * HTTP/2 Stream 状态标志
 *
 * 来源: Line 14939-14991
 * 可信度: 100%
 */
export enum Http2StreamStatus {
  NONE = 0,
  WANT_TRAILER = 2,                       // ✅
  STREAM_RESPONDED = 16,                  // ✅
  CLOSED = 8,                             // ✅
  WRITABLE_CLOSED = 32,                   // ✅
}

/**
 * Server HTTP/2 Stream
 *
 * 来源: Line 15085
 * 可信度: 95%
 */
export interface ServerHttp2Stream extends Http2Stream {
  // ⚠️ Server 方法
  respond(headers: any, options?: any): void;  // ⚠️
  end(data?: any, callback?: () => void): this;  // ⚠️
}

/**
 * Client HTTP/2 Stream
 *
 * 来源: Line 15009
 * 可信度: 95%
 */
export interface ClientHttp2Stream extends Http2Stream {
  // ⚠️ Client 方法
  end(data?: any, callback?: () => void): this;  // ⚠️
}

/**
 * Server HTTP/2 Session
 *
 * 来源: Line 15251
 * 可信度: 95%
 */
export interface ServerHttp2Session extends Http2Session {
  // ⚠️ Server 特定方法
}

/**
 * Client HTTP/2 Session
 *
 * 来源: Line 15277-15388
 * 可信度: 95%
 */
export interface ClientHttp2Session extends Http2Session {
  // ⚠️ Client 方法
  request(headers?: any, options?: any): ClientHttp2Stream;  // ⚠️

  // ⚠️ 静态方法
  static connect(url: string, options?: any, listener?: any): ClientHttp2Session;  // ✅ Line 15388
}

/**
 * HTTP/2 Server Request
 *
 * 来源: Line 14637-14702
 * 可信度: 90%
 */
export interface Http2ServerRequest extends Readable {
  // ⚠️ Request 属性
  headers: any;                           // ⚠️
  method: string;                         // ⚠️
  url: string;                            // ⚠️
  httpVersion: string;                    // ⚠️

  // ⚠️ Request 方法
  getHeader(name: string): string | undefined;  // ⚠️
}

/**
 * HTTP/2 Server Response
 *
 * 来源: Line 14702-14726
 * 可信度: 90%
 */
export interface Http2ServerResponse extends Stream {
  // ⚠️ Response 属性
  statusCode: number;                     // ⚠️
  statusMessage: string;                  // ⚠️
  headersSent: boolean;                   // ⚠️

  // ⚠️ Response 方法
  writeHead(statusCode: number, headers?: any): this;  // ⚠️
  setHeader(name: string, value: string): this;  // ⚠️
  getHeader(name: string): string | undefined;  // ⚠️
  removeHeader(name: string): this;       // ⚠️
  end(data?: any, callback?: () => void): this;  // ⚠️
}

/**
 * HTTP/2 Server
 *
 * 来源: Line 15441
 * 可信度: 95%
 */
export interface Http2Server extends EventEmitter {
  // ⚠️ Server 方法
  close(callback?: () => void): void;     // ⚠️
  listen(port?: number, hostname?: string, callback?: () => void): this;  // ⚠️

  // ⚠️ Server 事件
  on(event: 'stream', listener: (stream: ServerHttp2Stream, headers: any, flags: number, rawHeaders: any) => void): this;  // ✅ Line 14778
  on(event: 'error', listener: (error: Error) => void): this;
  on(event: 'close', listener: () => void): this;
}

/**
 * HTTP/2 Secure Server
 *
 * 来源: Line 15494
 * 可信度: 95%
 */
export interface Http2SecureServer extends Http2Server {
  // ⚠️ TLS 特定
}

/**
 * HTTP/2 符号常量
 *
 * 来源: Line 14902-14991
 * 可信度: 100%
 */
export const HTTP2_SYMBOLS = {
  bunHTTP2Socket: Symbol('bunHTTP2Socket'),           // ✅
  bunHTTP2OriginSet: Symbol('bunHTTP2OriginSet'),     // ✅
  bunHTTP2Session: Symbol('bunHTTP2Session'),         // ✅
  bunHTTP2StreamStatus: Symbol('bunHTTP2StreamStatus'),  // ✅
  bunHTTP2StreamFinal: Symbol('bunHTTP2StreamFinal'), // ✅
  bunHTTP2Headers: Symbol('bunHTTP2Headers'),         // ✅
} as const;
