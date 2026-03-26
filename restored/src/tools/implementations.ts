/**
 * Tool Implementations — Based on Extracted Real Code
 *
 * Reverse-engineered from claude_code_agent.js v2.1.83
 *
 * Obfuscated name mapping:
 *   C8       → executeShellCommand (shell wrapper, module g8q pos ~831100)
 *   U$       → execa (process spawning library)
 *   yo       → readFileContent (file read, module HN pos 825026)
 *   uw_      → writeFileAtomic (atomic write, module HN pos 827401)
 *   b8q      → detectEncoding (encoding detection, module EJ8 pos 824644)
 *   F3       → resolveSymlink (symlink resolution)
 *   x8q      → detectLineEndings (CRLF detection)
 *   AT       → getFs (get filesystem module)
 *   BR4      → BINARY_EXTENSIONS (binary file extension set, pos 839300)
 *   eJ8      → isBinaryContent (byte-level binary detection)
 *   Tq       → shellQuote (shell argument quoting, module g8q)
 *   B8q      → SECONDS_IN_MINUTE = 60
 *   d8q      → MS_IN_SECOND = 1000
 *
 * Source confidence:
 *   [CONFIRMED] — Directly extracted from minified code (complete source)
 *   [INFERRED]  — Reconstructed from call patterns
 *   [SPECULATIVE] — Reasonable implementation guess
 */

import * as fs from 'fs';
import * as path from 'path';
import { execFile, ExecFileOptions } from 'child_process';

// ============================================================================
// Constants [CONFIRMED]
// ============================================================================

/** [CONFIRMED] 60 seconds → obfuscated as B8q */
const SECONDS_IN_MINUTE = 60;

/** [CONFIRMED] 1000 ms → obfuscated as d8q */
const MS_IN_SECOND = 1000;

/** [CONFIRMED] Default shell timeout: 10 minutes */
const DEFAULT_SHELL_TIMEOUT = 10 * SECONDS_IN_MINUTE * MS_IN_SECOND; // 600000ms

/** [CONFIRMED] Default max buffer: 1MB */
const DEFAULT_MAX_BUFFER = 1024 * 1024; // 1MB

/**
 * Binary file extensions set.
 * Obfuscated: BR4 (pos 839300)
 * [CONFIRMED] — extracted from code
 */
export const BINARY_EXTENSIONS = new Set([
  // Images
  '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp', '.svg',
  '.tiff', '.tif', '.psd', '.raw', '.cr2', '.nef',
  // Documents
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.odt', '.ods', '.odp',
  // Executables / Libraries
  '.exe', '.dll', '.so', '.dylib', '.a', '.lib', '.o', '.obj',
  '.bin', '.elf', '.mach',
  // Archives
  '.zip', '.tar', '.gz', '.bz2', '.xz', '.7z', '.rar',
  '.zst', '.lz4', '.lzma',
  // Bytecode
  '.wasm', '.pyc', '.pyo', '.class', '.beam',
  // Databases
  '.sqlite', '.db', '.sqlite3', '.mdb', '.accdb',
  // Media
  '.mp3', '.mp4', '.avi', '.mkv', '.wav', '.flac', '.ogg',
  '.m4a', '.m4v', '.webm', '.mov', '.wmv',
  // Fonts
  '.ttf', '.otf', '.woff', '.woff2', '.eot',
  // Other binary
  '.iso', '.dmg', '.pkg', '.deb', '.rpm',
  '.swf', '.fla',
  '.dat', '.idx', '.pack',
]);

// ============================================================================
// Shell Execution — C8() [CONFIRMED]
// ============================================================================

/** Shell execution result */
export interface ShellResult {
  stdout: string;
  stderr: string;
  code: number;
  error?: string;
}

/** Shell execution options */
export interface ShellOptions {
  abortSignal?: AbortSignal;
  timeout?: number;
  preserveOutputOnError?: boolean;
  cwd?: string;
  env?: Record<string, string | undefined>;
  maxBuffer?: number;
  shell?: string | boolean;
  stdin?: string;
  input?: string;
}

/**
 * Execute a shell command. NEVER rejects — always resolves with result.
 *
 * Obfuscated name: C8 (module g8q, pos ~831100)
 *
 * [CONFIRMED] — Complete source extracted from minified code:
 *
 * ```javascript
 * function C8(command, args, {
 *   abortSignal, timeout = 10 * B8q * d8q,
 *   preserveOutputOnError = true, cwd, env,
 *   maxBuffer, shell, stdin, input
 * }) {
 *   return new Promise((resolve) => {
 *     U$(command, args, {/*...* /}).then((result) => {
 *       if (result.failed) { resolve({stdout, stderr, code, error}); }
 *       else { resolve({stdout, stderr, code: 0}); }
 *     }).catch((err) => { resolve({stdout: "", stderr: "", code: 1}); });
 *   });
 * }
 * ```
 *
 * Key characteristics:
 * - Uses U$ (execa) for process spawning
 * - NEVER rejects — catches all errors
 * - Default timeout: 10 minutes
 * - Default maxBuffer: 1MB
 * - Supports abort signals for cancellation
 * - preserveOutputOnError captures partial output on failure
 */
export function executeShellCommand(
  command: string,
  args: string[] = [],
  options: ShellOptions = {}
): Promise<ShellResult> {
  const {
    abortSignal,
    timeout = DEFAULT_SHELL_TIMEOUT,
    preserveOutputOnError = true,
    cwd,
    env,
    maxBuffer = DEFAULT_MAX_BUFFER,
    shell = true,
    stdin,
    input,
  } = options;

  return new Promise<ShellResult>((resolve) => {
    // [CONFIRMED] Uses execa (U$) under the hood
    // Simplified to use Node.js child_process since execa is not directly available
    const execOptions: ExecFileOptions = {
      timeout,
      maxBuffer,
      cwd,
      env: env ? { ...process.env, ...env } : undefined,
      shell: shell === true ? '/bin/bash' : (shell || undefined),
      signal: abortSignal,
    };

    // For shell=true, we pass command as string via execFile with shell option
    const child = execFile(
      command,
      args,
      execOptions,
      (error, stdout, stderr) => {
        if (error) {
          if (preserveOutputOnError) {
            resolve({
              stdout: (stdout || '').toString(),
              stderr: (stderr || '').toString(),
              code: (error as NodeJS.ErrnoException & { code?: number }).code
                ? 1
                : ((error as any).exitCode ?? 1),
              error: error.message || 'Command failed',
            });
          } else {
            resolve({
              stdout: '',
              stderr: '',
              code: (error as any).exitCode ?? 1,
            });
          }
        } else {
          resolve({
            stdout: (stdout || '').toString(),
            stderr: (stderr || '').toString(),
            code: 0,
          });
        }
      }
    );

    // [CONFIRMED] Support stdin input
    if (input && child.stdin) {
      child.stdin.write(input);
      child.stdin.end();
    }
  });
}

// ============================================================================
// File Read — yo() [CONFIRMED]
// ============================================================================

/** File read result */
export interface FileReadResult {
  content: string;
  encoding: BufferEncoding;
  lineEndings: 'LF' | 'CRLF' | 'mixed';
}

/**
 * Read file content with encoding detection and CRLF normalization.
 *
 * Obfuscated name: yo (module HN, pos 825026)
 *
 * [CONFIRMED] — Complete source extracted:
 *
 * ```javascript
 * function yo(path) {
 *   let fs = AT();
 *   let {resolvedPath, isSymlink} = F3(fs, path);
 *   if (isSymlink) log(`Reading through symlink: ${path} -> ${resolvedPath}`);
 *   let encoding = b8q(resolvedPath);
 *   let content = fs.readFileSync(resolvedPath, {encoding});
 *   let lineEndings = x8q(content.slice(0, 4096));
 *   return {content: content.replaceAll('\r\n', '\n'), encoding, lineEndings};
 * }
 * ```
 *
 * Key characteristics:
 * - Resolves symlinks before reading (F3)
 * - Auto-detects encoding (b8q) — utf-8, latin1, etc.
 * - Detects line endings (x8q) from first 4096 bytes
 * - Normalizes CRLF to LF
 */
export function readFileContent(filePath: string): FileReadResult {
  // Step 1: Symlink resolution [CONFIRMED]
  const { resolvedPath, isSymlink } = resolveSymlink(filePath);
  if (isSymlink) {
    // In original code: log(`Reading through symlink: ${path} -> ${resolvedPath}`)
  }

  // Step 2: Encoding detection [CONFIRMED]
  const encoding = detectEncoding(resolvedPath);
  if (encoding === null) {
    throw new Error(`Binary file detected: ${filePath}`);
  }

  // Step 3: Read content [CONFIRMED]
  const content = fs.readFileSync(resolvedPath, { encoding });

  // Step 4: Line ending detection [CONFIRMED] — only first 4096 bytes
  const lineEndings = detectLineEndings(content.slice(0, 4096));

  // Step 5: CRLF normalization [CONFIRMED]
  return {
    content: content.replaceAll('\r\n', '\n'),
    encoding,
    lineEndings,
  };
}

// ============================================================================
// File Write — uw_() [CONFIRMED]
// ============================================================================

/**
 * Atomically write file content with permission preservation.
 *
 * Obfuscated name: uw_ (module HN, pos 827401)
 *
 * [CONFIRMED] — Complete source extracted:
 *
 * ```javascript
 * function uw_(path, content, options = {encoding: "utf-8"}) {
 *   let fs = AT();
 *   let resolvedPath = path;
 *   try { let target = fs.readlinkSync(path);
 *     resolvedPath = isAbsolute(target) ? target : resolve(dirname(path), target);
 *   } catch {}
 *   let tmpPath = `${resolvedPath}.tmp.${process.pid}.${Date.now()}`;
 *   let mode;
 *   try { mode = fs.statSync(resolvedPath).mode; } catch {}
 *   try {
 *     writeFileSync(tmpPath, content, {encoding, flush: true});
 *     if (mode !== undefined) chmodSync(tmpPath, mode);
 *     fs.renameSync(tmpPath, resolvedPath);
 *   } catch {
 *     try { fs.unlinkSync(tmpPath); } catch {}
 *     writeFileSync(resolvedPath, content, options);
 *   }
 * }
 * ```
 *
 * Key characteristics:
 * - Atomic write pattern: write to temp → rename
 * - Writes through symlinks to real file
 * - Preserves original file permissions (mode)
 * - Fallback: direct write if atomic rename fails (cross-device)
 * - Uses {flush: true} to ensure data hits disk
 */
export function writeFileAtomic(
  filePath: string,
  content: string,
  options: { encoding?: BufferEncoding } = { encoding: 'utf-8' }
): void {
  const { encoding = 'utf-8' } = options;

  // Step 1: Resolve symlinks [CONFIRMED]
  let resolvedPath = filePath;
  try {
    const target = fs.readlinkSync(filePath);
    resolvedPath = path.isAbsolute(target)
      ? target
      : path.resolve(path.dirname(filePath), target);
  } catch {
    // Not a symlink, use original path
  }

  // Step 2: Ensure directory exists [INFERRED]
  const dir = path.dirname(resolvedPath);
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch {
    // Directory already exists or cannot create
  }

  // Step 3: Temp file name [CONFIRMED]
  const tmpPath = `${resolvedPath}.tmp.${process.pid}.${Date.now()}`;

  // Step 4: Preserve original permissions [CONFIRMED]
  let mode: number | undefined;
  try {
    mode = fs.statSync(resolvedPath).mode;
  } catch {
    // New file, no existing permissions
  }

  // Step 5: Atomic write: temp → rename [CONFIRMED]
  try {
    fs.writeFileSync(tmpPath, content, { encoding, flush: true } as any);
    if (mode !== undefined) {
      fs.chmodSync(tmpPath, mode);
    }
    fs.renameSync(tmpPath, resolvedPath); // Atomic!
  } catch {
    // Step 6: Fallback to direct write [CONFIRMED]
    try {
      fs.unlinkSync(tmpPath);
    } catch {
      // Cleanup temp file
    }
    fs.writeFileSync(resolvedPath, content, { encoding });
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Resolve symlinks for a file path.
 * Obfuscated: F3
 * [CONFIRMED] — used in yo() before reading
 */
export function resolveSymlink(filePath: string): {
  resolvedPath: string;
  isSymlink: boolean;
} {
  try {
    const stat = fs.lstatSync(filePath);
    if (stat.isSymbolicLink()) {
      const target = fs.readlinkSync(filePath);
      const resolvedPath = path.isAbsolute(target)
        ? target
        : path.resolve(path.dirname(filePath), target);
      return { resolvedPath, isSymlink: true };
    }
    return { resolvedPath: filePath, isSymlink: false };
  } catch {
    return { resolvedPath: filePath, isSymlink: false };
  }
}

/**
 * Detect file encoding by checking BOM and binary content.
 * Obfuscated: b8q (module EJ8, pos 824644)
 *
 * [CONFIRMED] — extracted logic:
 * 1. Read first 8192 bytes
 * 2. Check BOM markers (UTF-8, UTF-16LE, UTF-16BE)
 * 3. Check for null bytes (binary indicator)
 * 4. Default to utf-8
 *
 * Returns null if binary file detected.
 */
export function detectEncoding(filePath: string): BufferEncoding | null {
  const buffer = Buffer.alloc(8192);
  let bytesRead: number;

  try {
    const fd = fs.openSync(filePath, 'r');
    bytesRead = fs.readSync(fd, buffer, 0, 8192, 0);
    fs.closeSync(fd);
  } catch {
    return 'utf-8'; // Default on error
  }

  const slice = buffer.slice(0, bytesRead);

  // [CONFIRMED] BOM detection
  if (slice[0] === 0xEF && slice[1] === 0xBB && slice[2] === 0xBF) return 'utf-8';
  if (slice[0] === 0xFF && slice[1] === 0xFE) return 'utf16le';
  if (slice[0] === 0xFE && slice[1] === 0xFF) return 'utf16le'; // BE treated as LE in Node

  // [CONFIRMED] Null byte detection → binary
  for (let i = 0; i < slice.length; i++) {
    if (slice[i] === 0) return null; // Binary file
  }

  return 'utf-8'; // Default
}

/**
 * Detect line ending style from a text sample.
 * Obfuscated: x8q
 * [CONFIRMED] — detects from first 4096 bytes
 */
export function detectLineEndings(sample: string): 'LF' | 'CRLF' | 'mixed' {
  const crlfCount = (sample.match(/\r\n/g) || []).length;
  const lfOnly = (sample.match(/(?<!\r)\n/g) || []).length;

  if (crlfCount > 0 && lfOnly > 0) return 'mixed';
  if (crlfCount > 0) return 'CRLF';
  return 'LF';
}

/**
 * Check if a file is binary by extension.
 * Uses the BR4 set [CONFIRMED, pos 839300]
 */
export function isBinaryByExtension(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return BINARY_EXTENSIONS.has(ext);
}

/**
 * Check if content is binary by byte analysis.
 * Obfuscated: eJ8
 * [INFERRED] — checks first 8192 bytes for null bytes and control characters
 */
export function isBinaryContent(buffer: Buffer): boolean {
  const checkLength = Math.min(buffer.length, 8192);
  let nullCount = 0;
  let controlCount = 0;

  for (let i = 0; i < checkLength; i++) {
    if (buffer[i] === 0) nullCount++;
    if (buffer[i] < 32 && buffer[i] !== 9 && buffer[i] !== 10 && buffer[i] !== 13) {
      controlCount++;
    }
  }

  // [INFERRED] Any null bytes = binary
  if (nullCount > 0) return true;

  // [SPECULATIVE] High ratio of control characters = binary
  if (controlCount / checkLength > 0.1) return true;

  return false;
}

// ============================================================================
// Error Classes [CONFIRMED, pos 800705 module dq]
// ============================================================================

/**
 * Shell execution error.
 * Obfuscated: part of dq module (pos 800705)
 * [CONFIRMED]
 */
export class ShellError extends Error {
  constructor(
    message: string,
    public readonly code: number,
    public readonly stdout: string,
    public readonly stderr: string
  ) {
    super(message);
    this.name = 'ShellError';
  }
}

/**
 * Abort error — thrown when operation is cancelled.
 * Obfuscated: part of dq module (pos 800705)
 * [CONFIRMED]
 */
export class AbortError extends Error {
  constructor(message: string = 'Operation aborted') {
    super(message);
    this.name = 'AbortError';
  }
}

/**
 * Config parse error.
 * Obfuscated: part of dq module (pos 800705)
 * [CONFIRMED]
 */
export class ConfigParseError extends Error {
  constructor(
    message: string,
    public readonly filePath: string
  ) {
    super(message);
    this.name = 'ConfigParseError';
  }
}
