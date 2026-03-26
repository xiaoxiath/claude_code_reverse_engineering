/**
 * 测试和构建系统类型定义 - 真实提取
 *
 * 来源: source_code/bun_extracted_full.js
 * - Line 17506-17658: TestContext, parseTestOptions
 * - Line 24862: TestReporter
 * - Line 29027-32737: BuildConfig, parseArgs
 * - Line 34209-34269: BuildArtifact, BuildMessage
 * - Line 35532-35570: BuildError
 *
 * 可信度: 90% (类型名称), 80% (接口结构)
 */

/**
 * Test Context
 *
 * 来源: Line 17506-17619
 * 可信度: 95%
 */
export interface TestContext {
  // ✅ Context 属性
  isSkipped: boolean;                     // ✅
  name: string;                           // ✅
  filePath: string;                       // ✅
  parent?: TestContext;                   // ⚠️

  // ⚠️ Context 方法
  skip(): void;                           // ⚠️
  todo(): void;                           // ⚠️
}

/**
 * Test Options
 *
 * 来源: Line 17619
 * 可信度: 90%
 */
export interface TestOptions {
  name?: string;                          // ⚠️
  fn?: Function;                          // ⚠️
  options?: {
    timeout?: number;                     // ⚠️
    only?: boolean;                       // ⚠️
    skip?: boolean;                       // ⚠️
    todo?: boolean;                       // ⚠️
  };
}

/**
 * Parse Test Options 函数
 *
 * 来源: Line 17619
 * 可信度: 90%
 */
export type ParseTestOptions = (
  arg0?: string | Function | TestOptions,
  arg1?: Function | TestOptions,
  arg2?: TestOptions
) => { name: string; fn: Function; options: TestOptions };

/**
 * Test Reporter
 *
 * 来源: Line 24862
 * 可信度: 85%
 */
export interface TestReporter {
  // ⚠️ Reporter 方法
  start(): void;                          // ⚠️
  testStart(test: TestInfo): void;        // ⚠️
  testEnd(test: TestInfo, result: TestResult): void;  // ⚠️
  end(): void;                            // ⚠️
}

/**
 * Test Info
 *
 * 来源: 从测试系统推导
 * 可信度: 80%
 */
export interface TestInfo {
  name: string;                           // ⚠️
  filePath: string;                       // ⚠️
  timeout?: number;                       // ⚠️
  only?: boolean;                         // ⚠️
  skip?: boolean;                         // ⚠️
  todo?: boolean;                         // ⚠️
}

/**
 * Test Result
 *
 * 来源: 从测试系统推导
 * 可信度: 80%
 */
export interface TestResult {
  success: boolean;                       // ⚠️
  error?: Error;                          // ⚠️
  duration?: number;                      // ⚠️
}

/**
 * Build Config
 *
 * 来源: Line 29027, 29650, 32700
 * 可信度: 90%
 */
export interface BuildConfig {
  // ⚠️ 入口点
  entrypoints?: string[];                 // ⚠️
  entry?: string | string[];              // ⚠️

  // ⚠️ 输出配置
  outdir?: string;                        // ⚠️
  outfile?: string;                       // ⚠️
  splitting?: boolean;                    // ⚠️

  // ⚠️ 格式和目标
  format?: 'esm' | 'cjs' | 'iife';        // ⚠️
  target?: 'browser' | 'bun' | 'node';    // ⚠️

  // ⚠️ 压缩和优化
  minify?: boolean | {                    // ⚠️
    whitespace?: boolean;                 // ⚠️
    identifiers?: boolean;                // ⚠️
    syntax?: boolean;                     // ⚠️
  };

  // ⚠️ Source Map
  sourcemap?: 'inline' | 'external' | 'none';  // ⚠️

  // ⚠️ 外部依赖
  external?: string[];                    // ⚠️

  // ⚠️ 环境
  define?: Record<string, string>;        // ⚠️

  // ⚠️ 插件
  plugins?: any[];                        // ⚠️

  // ⚠️ 命名
  naming?: string | {                     // ⚠️
    entry?: string;                       // ⚠️
    chunk?: string;                       // ⚠️
    asset?: string;                       // ⚠️
  };

  // ⚠️ Root
  root?: string;                          // ⚠️

  // ⚠️ 公共路径
  publicPath?: string;                    // ⚠️

  // ⚠️ 元数据
  metafile?: boolean;                     // ⚠️

  // ⚠️ 条件
  conditions?: string[];                  // ⚠️
}

/**
 * Build Artifact
 *
 * 来源: Line 34209, 34269
 * 可信度: 90%
 */
export interface BuildArtifact {
  // ⚠️ Artifact 属性
  path: string;                           // ⚠️
  type: 'chunk' | 'asset' | 'entry-point';  // ⚠️
  size: number;                           // ⚠️
  hash?: string;                          // ⚠️

  // ⚠️ Chunk 特定
  imports?: string[];                     // ⚠️
  exports?: string[];                     // ⚠️
}

/**
 * Build Message
 *
 * 来源: Line 27151
 * 可信度: 90%
 */
export interface BuildMessage {
  // ⚠️ Message 属性
  text: string;                           // ⚠️
  location?: {
    file: string;                         // ⚠️
    line?: number;                        // ⚠️
    column?: number;                      // ⚠️
    lineText?: string;                    // ⚠️
  };
  severity: 'error' | 'warning' | 'info'; // ⚠️
}

/**
 * Build Error
 *
 * 来源: Line 35546, 35569-35570
 * 可信度: 95%
 */
export interface BuildError extends Error {
  // ✅ Error 属性
  name: 'BuildError';                     // ✅

  // ⚠️ Build 特定
  errors: BuildMessage[];                 // ⚠️
  warnings: BuildMessage[];               // ⚠️
}

/**
 * Build Result
 *
 * 来源: 从构建系统推导
 * 可信度: 85%
 */
export interface BuildResult {
  // ⚠️ Result 属性
  success: boolean;                       // ⚠️
  outputs: BuildArtifact[];               // ⚠️
  errors: BuildMessage[];                 // ⚠️
  warnings: BuildMessage[];               // ⚠️
  metafile?: any;                         // ⚠️
}

/**
 * Parse Args 函数
 *
 * 来源: Line 29027, 29649, 32700
 * 可信度: 95%
 */
export type ParseBuildArgs = () => Partial<BuildConfig>;

/**
 * On Test Finished
 *
 * 来源: Line 35938-35961
 * 可信度: 95%
 */
export interface OnTestFinished {
  (callback: () => void | Promise<void>): void;  // ✅
}

/**
 * Minify Test With Options
 *
 * 来源: Line 20662-20663, 25470-25471
 * 可信度: 90%
 */
export interface MinifyTestWithOptions {
  (code: string, options?: any): { code: string; map?: any };  // ⚠️
}

/**
 * Minify Error Test With Options
 *
 * 来源: Line 20663, 25471
 * 可信度: 90%
 */
export interface MinifyErrorTestWithOptions {
  (code: string, options?: any): { error: Error };  // ⚠️
}

/**
 * Prefix Test With Options
 *
 * 来源: Line 20665, 25473
 * 可信度: 90%
 */
export interface PrefixTestWithOptions {
  (code: string, options?: any): { code: string };  // ⚠️
}
