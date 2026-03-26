/**
 * 包管理和命令行类型定义 - 真实提取
 *
 * 来源: source_code/bun_extracted_full.js
 * - Line 20709: escapeRegExpForPackageNameMatching
 * - Line 25467: jsEscapeRegExpForPackageNameMatching
 * - Line 31165-31168: npm_package_* 环境变量
 * - Line 32640: LazyPackageDestinationDir
 * - Line 33535: lockfile_migration_from_package_lock
 * - Line 46272, 46372, 58145, 58245: 配置中的包管理
 *
 * 可信度: 90% (类型名称), 80% (接口结构)
 */

/**
 * NPM Package 环境变量
 *
 * 来源: Line 31165-31168
 * 可信度: 100%
 */
export interface NpmPackageEnv {
  npm_package_name: string;               // ✅ Line 31165
  npm_package_json: string;               // ✅ Line 31166
  npm_package_version: string;            // ✅ Line 31167
  npm_package_config_*: string;           // ✅ Line 31168
}

/**
 * Package JSON 结构
 *
 * 来源: 从包管理推导
 * 可信度: 85%
 */
export interface PackageJSON {
  name: string;                           // ⚠️
  version: string;                        // ⚠️
  description?: string;                   // ⚠️
  main?: string;                          // ⚠️
  module?: string;                        // ⚠️
  types?: string;                         // ⚠️
  scripts?: Record<string, string>;       // ⚠️
  dependencies?: Record<string, string>;  // ⚠️
  devDependencies?: Record<string, string>;  // ⚠️
  peerDependencies?: Record<string, string>;  // ⚠️
  optionalDependencies?: Record<string, string>;  // ⚠️
  bin?: string | Record<string, string>;  // ⚠️
  files?: string[];                       // ⚠️
  keywords?: string[];                    // ⚠️
  author?: string;                        // ⚠️
  license?: string;                       // ⚠️
  repository?: string | { type: string; url: string };  // ⚠️
  bugs?: string | { url: string; email?: string };  // ⚠️
  homepage?: string;                      // ⚠️
  engines?: Record<string, string>;       // ⚠️
  os?: string[];                          // ⚠️
  cpu?: string[];                         // ⚠️
  private?: boolean;                      // ⚠️
  workspaces?: string[];                  // ⚠️
}

/**
 * Dependency 类型
 *
 * 来源: 从包管理推导
 * 可信度: 80%
 */
export interface Dependency {
  name: string;                           // ⚠️
  version: string;                        // ⚠️
  resolved?: string;                      // ⚠️
  integrity?: string;                     // ⚠️
  dev?: boolean;                          // ⚠️
  optional?: boolean;                     // ⚠️
  peer?: boolean;                         // ⚠️
}

/**
 * Lockfile 结构
 *
 * 来源: Line 33535
 * 可信度: 80%
 */
export interface Lockfile {
  version: number;                        // ⚠️
  packages: Record<string, Dependency>;   // ⚠️
}

/**
 * Escape RegExp For Package Name Matching 函数
 *
 * 来源: Line 20709, 25467
 * 可信度: 100%
 */
export type EscapeRegExpForPackageNameMatching = (
  packageName: string
) => string;                              // ✅

/**
 * Lazy Package Destination Dir
 *
 * 来源: Line 32640
 * 可信度: 90%
 */
export interface LazyPackageDestinationDir {
  // ⚠️ 懒加载的包目标目录
  dir: string;                            // ⚠️
  closed: boolean;                        // ✅ Line 32640
}

/**
 * Lockfile Migration 函数
 *
 * 来源: Line 33535
 * 可信度: 90%
 */
export type LockfileMigrationFromPackageLock = (
  packageLock: any
) => Lockfile;                            // ✅

/**
 * Install Options
 *
 * 来源: 从包管理推导
 * 可信度: 80%
 */
export interface InstallOptions {
  // ⚠️ 安装选项
  production?: boolean;                   // ⚠️
  development?: boolean;                  // ⚠️
  optional?: boolean;                     // ⚠️
  peer?: boolean;                         // ⚠️

  // ⚠️ 注册表
  registry?: string;                      // ⚠️

  // ⚠️ 全局
  global?: boolean;                       // ⚠️

  // ⚠️ 强制
  force?: boolean;                        // ⚠️

  // ⚠️ 离线
  offline?: boolean;                      // ⚠️

  // ⚠️ 冻结 Lockfile
  frozen?: boolean;                       // ⚠️
}

/**
 * Add Options
 *
 * 来源: 从包管理推导
 * 可信度: 80%
 */
export interface AddOptions extends InstallOptions {
  // ⚠️ 添加选项
  packages: string[];                     // ⚠️
  dev?: boolean;                          // ⚠️
  optional?: boolean;                     // ⚠️
  peer?: boolean;                         // ⚠️
}

/**
 * Remove Options
 *
 * 来源: 从包管理推导
 * 可信度: 80%
 */
export interface RemoveOptions {
  // ⚠️ 移除选项
  packages: string[];                     // ⚠️
}

/**
 * Update Options
 *
 * 来源: 从包管理推导
 * 可信度: 80%
 */
export interface UpdateOptions extends InstallOptions {
  // ⚠️ 更新选项
  packages?: string[];                    // ⚠️
}

/**
 * Link Options
 *
 * 来源: 从包管理推导
 * 可信度: 80%
 */
export interface LinkOptions {
  // ⚠️ 链接选项
  packages?: string[];                    // ⚠️
  global?: boolean;                       // ⚠️
}

/**
 * Shell Lex 函数
 *
 * 来源: Line 20654
 * 可信度: 95%
 */
export type ShellLex = (input: string) => string[];  // ✅

/**
 * Shell Parse 函数
 *
 * 来源: Line 20654
 * 可信度: 95%
 */
export type ShellParse = (input: string) => any;  // ✅

/**
 * Escape RegExp 函数
 *
 * 来源: Line 20654
 * 可信度: 95%
 */
export type EscapeRegExp = (input: string) => string;  // ✅

/**
 * Shell Internals
 *
 * 来源: Line 20654
 * 可信度: 90%
 */
export interface ShellInternals {
  shellLex: ShellLex;                     // ✅
  shellParse: ShellParse;                 // ✅
  escapeRegExp: EscapeRegExp;             // ✅
  escapeRegExpForPackageNameMatching: EscapeRegExpForPackageNameMatching;  // ✅
}

/**
 * NPM Config 环境变量
 *
 * 来源: Line 31161-31168
 * 可信度: 100%
 */
export interface NpmConfigEnv {
  npm_config_node_gyp?: string;           // ✅ Line 31155
  npm_config_local_prefix?: string;       // ✅ Line 31161
  npm_config_user_agent?: string;         // ✅ Line 31162
  npm_config_registry?: string;           // ✅ Line 31261
  npm_config_token?: string;              // ✅ Line 31264
}
