/**
 * Sandbox Configuration — seccomp (Linux), macOS Isolation, Network/Filesystem Rules
 *
 * Reverse-engineered from claude_code_agent.js v2.1.83
 * Build: 2026-03-25T05:15:24Z
 *
 * Obfuscated name mapping:
 *   Y8       → sandbox (sandbox singleton, initialized in awO() at pos 1830703)
 *   Y8.initialize → initializeSandbox (takes askCallback parameter)
 *   eq       → environment detection (platform, arch, isCI, etc.)
 *
 * Source confidence:
 *   [CONFIRMED] — Directly extracted from minified code
 *   [INFERRED]  — Reconstructed from call sites and data flow
 *   [SPECULATIVE] — Reasonable guess based on patterns
 */

// ============================================================================
// Sandbox Configuration Schema [CONFIRMED, pos ~897600-898340]
// ============================================================================

/**
 * Network isolation configuration.
 *
 * [CONFIRMED] — from sandbox configuration validation schema (pos ~898340)
 * Controls which network destinations the sandboxed process can reach.
 */
export interface SandboxNetworkConfig {
  /** Domains allowed for outbound connections */
  allowedDomains: string[];

  /**
   * If true, only Anthropic-managed domains are allowed.
   * [CONFIRMED] — restricts to API endpoints + MCP proxy
   */
  allowManagedDomainsOnly: boolean;

  /**
   * Unix socket paths allowed (macOS only).
   * [CONFIRMED] — macOS uses Unix sockets for IPC
   */
  allowUnixSockets: string[];

  /**
   * If true, all Unix sockets are allowed (macOS only).
   * [CONFIRMED]
   */
  allowAllUnixSockets: boolean;

  /**
   * Allow binding to local addresses (localhost).
   * [CONFIRMED]
   */
  allowLocalBinding: boolean;

  /**
   * HTTP proxy port for sandboxed network access.
   * [CONFIRMED]
   */
  httpProxyPort: number;

  /**
   * SOCKS proxy port for sandboxed network access.
   * [CONFIRMED]
   */
  socksProxyPort: number;
}

/**
 * Filesystem isolation configuration.
 *
 * [CONFIRMED] — from sandbox configuration validation schema
 * Controls which paths the sandboxed process can read/write.
 */
export interface SandboxFilesystemConfig {
  /** Paths allowed for writing (glob patterns) */
  allowWrite: string[];

  /** Paths denied for writing (glob patterns, overrides allowWrite) */
  denyWrite: string[];

  /** Paths denied for reading (glob patterns) */
  denyRead: string[];

  /** Paths allowed for reading (glob patterns) */
  allowRead: string[];

  /**
   * If true, only managed read paths are allowed.
   * [CONFIRMED] — strict mode for read access
   */
  allowManagedReadPathsOnly: boolean;
}

/**
 * Complete sandbox configuration.
 *
 * [CONFIRMED] — from validation schema at pos ~897600
 * This is the full schema for the `sandbox` key in settings.
 */
export interface SandboxConfig {
  /** Whether sandboxing is enabled */
  enabled: boolean;

  /**
   * If true, fail startup if sandbox cannot be established.
   * [CONFIRMED] — safety net for environments requiring sandbox
   */
  failIfUnavailable: boolean;

  /**
   * If true, auto-allow Bash commands when sandbox is active.
   * [CONFIRMED] — sandbox provides containment, so Bash is safer
   */
  autoAllowBashIfSandboxed: boolean;

  /**
   * If true, allow commands to run unsandboxed when sandbox is unavailable.
   * [CONFIRMED]
   */
  allowUnsandboxedCommands: boolean;

  /** Network isolation configuration */
  network: SandboxNetworkConfig;

  /** Filesystem isolation configuration */
  filesystem: SandboxFilesystemConfig;

  /**
   * Map of command names to violation types to ignore.
   * [CONFIRMED] — allows specific known-safe violations
   */
  ignoreViolations: Record<string, string[]>;

  /**
   * Enable weaker nested sandbox (for Docker-in-Docker etc.).
   * [CONFIRMED]
   */
  enableWeakerNestedSandbox: boolean;

  /**
   * Enable weaker network isolation (allows TLS cert verification).
   * [CONFIRMED] — needed for mTLS/custom CA setups
   */
  enableWeakerNetworkIsolation: boolean;

  /**
   * Commands excluded from sandboxing.
   * [CONFIRMED]
   */
  excludedCommands: string[];

  /**
   * Ripgrep configuration for sandboxed search.
   * [CONFIRMED] — custom ripgrep command/args for sandbox-safe search
   */
  ripgrep: {
    command: string;
    args?: string[];
  };
}

// ============================================================================
// Default Configuration [INFERRED]
// ============================================================================

/**
 * Default sandbox configuration.
 *
 * [INFERRED] — based on schema defaults and common patterns
 */
export const DEFAULT_SANDBOX_CONFIG: SandboxConfig = {
  enabled: true,
  failIfUnavailable: false,
  autoAllowBashIfSandboxed: false,
  allowUnsandboxedCommands: false,
  network: {
    allowedDomains: [],
    allowManagedDomainsOnly: false,
    allowUnixSockets: [],
    allowAllUnixSockets: false,
    allowLocalBinding: false,
    httpProxyPort: 0,
    socksProxyPort: 0,
  },
  filesystem: {
    allowWrite: [],
    denyWrite: [],
    denyRead: [],
    allowRead: [],
    allowManagedReadPathsOnly: false,
  },
  ignoreViolations: {},
  enableWeakerNestedSandbox: false,
  enableWeakerNetworkIsolation: false,
  excludedCommands: [],
  ripgrep: {
    command: 'rg',
  },
};

// ============================================================================
// Platform Detection [CONFIRMED]
// ============================================================================

/**
 * Sandbox platform type.
 * [CONFIRMED] — sandbox uses platform-specific isolation mechanisms
 */
export type SandboxPlatform = 'linux' | 'macos' | 'unsupported';

/**
 * Detects the sandbox platform.
 *
 * [CONFIRMED] — from eq environment detection:
 *   eq.platform gives the current platform
 *
 * Linux → seccomp syscall filtering
 * macOS → platform-specific + Unix socket control
 * Other → sandbox unavailable
 */
export function detectSandboxPlatform(): SandboxPlatform {
  const platform = process.platform;
  if (platform === 'linux') return 'linux';
  if (platform === 'darwin') return 'macos';
  return 'unsupported';
}

// ============================================================================
// Linux Sandbox (seccomp) [CONFIRMED]
// ============================================================================

/**
 * Linux sandbox implementation using seccomp syscall filtering.
 *
 * [CONFIRMED] — from analysis: "Linux | seccomp syscall 过滤 (注: 不能按路径过滤)"
 * [CONFIRMED] — NO BubbleWrap/bwrap references found in the bundle
 *
 * Key limitation: seccomp operates at the syscall level and CANNOT filter
 * by file path. Filesystem isolation is handled through other means
 * (e.g., chroot or namespace, or simply not enforced at the FS level).
 */
export interface LinuxSandboxState {
  platform: 'linux';
  /** Whether seccomp filter is installed */
  seccompInstalled: boolean;
  /** Whether network namespace is isolated */
  networkIsolated: boolean;
  /** Allowed syscalls (seccomp whitelist) */
  allowedSyscalls: string[];
}

/**
 * Configures Linux seccomp sandbox.
 *
 * [CONFIRMED] — Linux uses seccomp for syscall filtering
 * [INFERRED] — initialization flow from Y8.initialize()
 *
 * seccomp (Secure Computing Mode) provides:
 * - Syscall filtering: only whitelisted syscalls are allowed
 * - No file path filtering (seccomp operates at syscall level only)
 * - Process-level isolation
 *
 * @param config - Sandbox configuration
 * @returns Linux sandbox state
 */
export function configureLinuxSandbox(config: SandboxConfig): LinuxSandboxState {
  // [INFERRED] The actual seccomp filter is compiled as a native Bun module
  // loaded from /$bunfs/root/ embedded filesystem.
  //
  // The JS code configures which syscalls to allow/deny and delegates
  // to the native module for BPF filter installation.

  const allowedSyscalls = buildSyscallAllowlist(config);

  return {
    platform: 'linux',
    seccompInstalled: false, // Set to true after native module installation
    networkIsolated: config.network.allowManagedDomainsOnly,
    allowedSyscalls,
  };
}

/**
 * Builds the syscall allowlist for seccomp.
 *
 * [INFERRED] — common syscalls needed for Node.js/Bun operation
 * [SPECULATIVE] — exact list is within the native module
 */
function buildSyscallAllowlist(config: SandboxConfig): string[] {
  // Base syscalls needed for any Bun/Node.js process
  const base = [
    'read',
    'write',
    'open',
    'close',
    'stat',
    'fstat',
    'lstat',
    'poll',
    'lseek',
    'mmap',
    'mprotect',
    'munmap',
    'brk',
    'ioctl',
    'access',
    'pipe',
    'dup',
    'dup2',
    'getpid',
    'clone',
    'execve',
    'wait4',
    'kill',
    'fcntl',
    'flock',
    'fsync',
    'fdatasync',
    'truncate',
    'ftruncate',
    'getdents',
    'getcwd',
    'chdir',
    'rename',
    'mkdir',
    'rmdir',
    'unlink',
    'readlink',
    'symlink',
    'chmod',
    'fchmod',
    'chown',
    'fchown',
    'umask',
    'gettimeofday',
    'getrlimit',
    'getuid',
    'getgid',
    'geteuid',
    'getegid',
    'sigaction',
    'sigprocmask',
    'sigreturn',
    'clock_gettime',
    'clock_getres',
    'exit_group',
    'epoll_create',
    'epoll_ctl',
    'epoll_wait',
    'eventfd2',
    'timerfd_create',
    'timerfd_settime',
    'futex',
    'sched_yield',
    'nanosleep',
    'openat',
    'mkdirat',
    'unlinkat',
    'renameat',
    'readlinkat',
    'fstatat',
    'pipe2',
    'epoll_create1',
    'getrandom',
    'memfd_create',
    'statx',
  ];

  // Network syscalls (conditionally allowed)
  if (!config.network.allowManagedDomainsOnly) {
    base.push('socket', 'connect', 'bind', 'listen', 'accept', 'sendto', 'recvfrom', 'sendmsg', 'recvmsg', 'shutdown', 'getsockname', 'getpeername', 'setsockopt', 'getsockopt', 'accept4');
  }

  return base;
}

// ============================================================================
// macOS Sandbox [CONFIRMED]
// ============================================================================

/**
 * macOS sandbox state.
 *
 * [CONFIRMED] — macOS uses platform-specific isolation + Unix socket control
 */
export interface MacOSSandboxState {
  platform: 'macos';
  /** Whether platform sandbox is active */
  sandboxActive: boolean;
  /** Allowed Unix socket paths */
  allowedUnixSockets: string[];
  /** Whether weaker network isolation is enabled (for TLS cert verification) */
  weakerNetworkIsolation: boolean;
}

/**
 * Configures macOS sandbox.
 *
 * [CONFIRMED] — macOS uses platform-specific sandbox + Unix socket control
 * [CONFIRMED] — enableWeakerNetworkIsolation allows TLS certificate verification
 *
 * macOS sandbox provides:
 * - Application sandboxing via sandbox-exec or similar mechanism
 * - Unix socket control for IPC
 * - Weaker network isolation option for mTLS/custom CA
 *
 * @param config - Sandbox configuration
 */
export function configureMacOSSandbox(config: SandboxConfig): MacOSSandboxState {
  const allowedUnixSockets = config.network.allowAllUnixSockets
    ? [] // Empty means all allowed
    : [...config.network.allowUnixSockets];

  return {
    platform: 'macos',
    sandboxActive: false, // Set to true after sandbox activation
    allowedUnixSockets,
    weakerNetworkIsolation: config.enableWeakerNetworkIsolation,
  };
}

// ============================================================================
// Sandbox Ask Callback [CONFIRMED, pos 1830703]
// ============================================================================

/**
 * Callback type for sandbox permission prompts.
 *
 * [CONFIRMED] — from initialization at pos 1830703:
 *   `Y8.initialize(H.createSandboxAskCallback())`
 *
 * When the sandbox intercepts an operation that requires user approval,
 * this callback is invoked to prompt the user.
 */
export type SandboxAskCallback = (
  operation: string,
  details: string,
) => Promise<boolean>;

// ============================================================================
// Sandbox Manager [CONFIRMED/INFERRED]
// ============================================================================

/**
 * Sandbox state union type.
 */
export type SandboxState = LinuxSandboxState | MacOSSandboxState | null;

/**
 * SandboxManager — Central sandbox control.
 *
 * Obfuscated: Y8 (sandbox singleton)
 *
 * [CONFIRMED] — Y8 is initialized at pos 1830703 in awO()
 * [CONFIRMED] — Y8.initialize() takes an askCallback parameter
 * [INFERRED] — manager pattern reconstructed from usage
 *
 * Lifecycle:
 * 1. awO() calls Y8.initialize(H.createSandboxAskCallback())
 * 2. Sandbox detects platform and configures isolation
 * 3. All tool executions (Bash, file I/O) go through sandbox checks
 * 4. Violations are either blocked, ignored (ignoreViolations), or prompted
 */
export class SandboxManager {
  /** Current sandbox configuration */
  private config: SandboxConfig;

  /** Platform-specific sandbox state */
  private state: SandboxState = null;

  /** Whether the sandbox has been initialized */
  private initialized = false;

  /** Callback for asking user about sandbox violations */
  private askCallback: SandboxAskCallback | null = null;

  /** Detected platform */
  private platform: SandboxPlatform;

  constructor(config: SandboxConfig = DEFAULT_SANDBOX_CONFIG) {
    this.config = config;
    this.platform = detectSandboxPlatform();
  }

  /**
   * Initializes the sandbox.
   * Obfuscated: Y8.initialize()
   *
   * [CONFIRMED] — from pos 1830703: `Y8.initialize(H.createSandboxAskCallback())`
   *
   * @param askCallback - Callback for user prompts on sandbox violations
   */
  async initialize(askCallback: SandboxAskCallback): Promise<void> {
    if (this.initialized) return;

    this.askCallback = askCallback;

    if (!this.config.enabled) {
      this.initialized = true;
      return;
    }

    try {
      switch (this.platform) {
        case 'linux':
          this.state = configureLinuxSandbox(this.config);
          // [INFERRED] Install seccomp filter via native module
          await this.installLinuxSeccomp();
          break;

        case 'macos':
          this.state = configureMacOSSandbox(this.config);
          // [INFERRED] Activate macOS sandbox profile
          await this.activateMacOSSandbox();
          break;

        case 'unsupported':
          if (this.config.failIfUnavailable) {
            throw new Error(
              `Sandbox is required but not available on platform: ${process.platform}`,
            );
          }
          // [CONFIRMED] — sandbox unavailable on unsupported platforms
          break;
      }
    } catch (error) {
      if (this.config.failIfUnavailable) {
        throw error;
      }
      // [INFERRED] Sandbox failure is logged but doesn't block operation
      console.error('Sandbox initialization failed:', error);
    }

    this.initialized = true;
  }

  /**
   * Checks whether a command should be sandboxed.
   *
   * [CONFIRMED] — excludedCommands allows bypassing sandbox for specific commands
   * [CONFIRMED] — autoAllowBashIfSandboxed auto-approves Bash when sandbox is active
   *
   * @param command - The command to check
   * @returns Whether the command should run in the sandbox
   */
  shouldSandboxCommand(command: string): boolean {
    if (!this.config.enabled || !this.isActive()) return false;

    // [CONFIRMED] Check excluded commands
    const commandName = command.split(/\s+/)[0];
    if (this.config.excludedCommands.includes(commandName)) {
      return false;
    }

    return true;
  }

  /**
   * Checks whether a Bash command should be auto-allowed due to sandbox.
   *
   * [CONFIRMED] — autoAllowBashIfSandboxed setting
   */
  shouldAutoAllowBash(): boolean {
    return this.config.autoAllowBashIfSandboxed && this.isActive();
  }

  /**
   * Checks if a network request to a domain is allowed.
   *
   * [CONFIRMED] — allowedDomains and allowManagedDomainsOnly
   */
  isNetworkAllowed(domain: string): boolean {
    if (!this.config.enabled || !this.isActive()) return true;

    // [CONFIRMED] Managed domains are always allowed
    const managedDomains = [
      'api.anthropic.com',
      'mcp-proxy.anthropic.com',
      'platform.claude.com',
      'statsig.anthropic.com',
    ];

    if (managedDomains.includes(domain)) return true;

    if (this.config.network.allowManagedDomainsOnly) {
      return false;
    }

    if (this.config.network.allowedDomains.length > 0) {
      return this.config.network.allowedDomains.some((allowed) => {
        if (allowed.startsWith('*.')) {
          return domain.endsWith(allowed.substring(1));
        }
        return domain === allowed;
      });
    }

    return true;
  }

  /**
   * Checks if a file write is allowed by the sandbox.
   *
   * [CONFIRMED] — filesystem.allowWrite / denyWrite rules
   */
  isWriteAllowed(filePath: string): boolean {
    if (!this.config.enabled || !this.isActive()) return true;

    // [CONFIRMED] denyWrite overrides allowWrite
    for (const pattern of this.config.filesystem.denyWrite) {
      if (matchPathPattern(pattern, filePath)) return false;
    }

    if (this.config.filesystem.allowWrite.length > 0) {
      return this.config.filesystem.allowWrite.some((pattern) =>
        matchPathPattern(pattern, filePath),
      );
    }

    return true;
  }

  /**
   * Checks if a file read is allowed by the sandbox.
   *
   * [CONFIRMED] — filesystem.denyRead / allowRead / allowManagedReadPathsOnly
   */
  isReadAllowed(filePath: string): boolean {
    if (!this.config.enabled || !this.isActive()) return true;

    // [CONFIRMED] denyRead blocks
    for (const pattern of this.config.filesystem.denyRead) {
      if (matchPathPattern(pattern, filePath)) return false;
    }

    if (this.config.filesystem.allowManagedReadPathsOnly) {
      return this.config.filesystem.allowRead.some((pattern) =>
        matchPathPattern(pattern, filePath),
      );
    }

    return true;
  }

  /**
   * Checks if a violation should be ignored.
   *
   * [CONFIRMED] — ignoreViolations: Record<string, string[]>
   */
  shouldIgnoreViolation(command: string, violationType: string): boolean {
    const ignored = this.config.ignoreViolations[command];
    if (!ignored) return false;
    return ignored.includes(violationType);
  }

  /**
   * Whether the sandbox is currently active and enforcing.
   * [INFERRED]
   */
  isActive(): boolean {
    if (!this.initialized || !this.config.enabled) return false;
    if (!this.state) return false;
    if (this.state.platform === 'linux') return this.state.seccompInstalled;
    if (this.state.platform === 'macos') return this.state.sandboxActive;
    return false;
  }

  /**
   * Returns the current sandbox state for diagnostics.
   * [INFERRED]
   */
  getState(): SandboxState {
    return this.state;
  }

  /**
   * Returns the sandbox configuration.
   * [INFERRED]
   */
  getConfig(): SandboxConfig {
    return this.config;
  }

  // --------------------------------------------------------------------------
  // Platform-Specific Installation [INFERRED/SPECULATIVE]
  // --------------------------------------------------------------------------

  /**
   * Installs seccomp BPF filter on Linux.
   *
   * [CONFIRMED] — Linux uses seccomp syscall filtering
   * [SPECULATIVE] — actual native module loading is behind M() closure
   *
   * The actual implementation likely:
   * 1. Loads a native module from /$bunfs/root/
   * 2. Compiles a BPF filter from the syscall allowlist
   * 3. Installs the filter via prctl(PR_SET_SECCOMP)
   */
  private async installLinuxSeccomp(): Promise<void> {
    if (this.state?.platform !== 'linux') return;

    // [SPECULATIVE] Native module handles actual seccomp installation
    // The JS code only configures which syscalls to allow; the native
    // module compiles and installs the BPF filter.
    try {
      // In the actual bundle, this would load the native seccomp module:
      // const seccompModule = require('/$bunfs/root/seccomp.node');
      // seccompModule.install(this.state.allowedSyscalls);
      (this.state as LinuxSandboxState).seccompInstalled = true;
    } catch (error) {
      console.error('Failed to install seccomp filter:', error);
      if (this.config.failIfUnavailable) throw error;
    }
  }

  /**
   * Activates macOS sandbox profile.
   *
   * [CONFIRMED] — macOS uses platform-specific sandbox
   * [SPECULATIVE] — may use sandbox-exec or custom dylib
   */
  private async activateMacOSSandbox(): Promise<void> {
    if (this.state?.platform !== 'macos') return;

    try {
      // [SPECULATIVE] macOS sandbox activation mechanism
      // Could use: sandbox_init(), sandbox-exec wrapper, or custom dylib
      (this.state as MacOSSandboxState).sandboxActive = true;
    } catch (error) {
      console.error('Failed to activate macOS sandbox:', error);
      if (this.config.failIfUnavailable) throw error;
    }
  }
}

// ============================================================================
// Path Pattern Matching [INFERRED]
// ============================================================================

/**
 * Matches a file path against a glob-like pattern.
 *
 * [INFERRED] — similar to permission rule file pattern matching
 * Supports: * (single segment), ** (recursive), exact match
 */
function matchPathPattern(pattern: string, filePath: string): boolean {
  // Exact match
  if (pattern === filePath) return true;

  // Convert glob pattern to regex
  const regexStr = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
    .replace(/\*\*/g, '{{GLOBSTAR}}')       // Placeholder for **
    .replace(/\*/g, '[^/]*')                // * = single path segment
    .replace(/\{\{GLOBSTAR\}\}/g, '.*');    // ** = any path depth

  try {
    const regex = new RegExp(`^${regexStr}$`);
    return regex.test(filePath);
  } catch {
    return false;
  }
}

// ============================================================================
// Module Singleton [CONFIRMED]
// ============================================================================

/**
 * Global sandbox singleton.
 * Obfuscated: Y8
 *
 * [CONFIRMED] — from awO() at pos 1830703:
 *   `Y8.initialize(H.createSandboxAskCallback())`
 */
export const sandbox = new SandboxManager();
