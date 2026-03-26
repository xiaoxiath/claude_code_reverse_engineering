/**
 * Permission Manager - Complete Implementation
 *
 * Restored from Bun 2.1.83 binary
 * Manages tool execution permissions with multiple modes
 */

import { EventEmitter } from 'events';
import * as readline from 'readline';

// ============================================
// Type Definitions
// ============================================

export type PermissionMode = 'allow' | 'deny' | 'interactive' | 'sandbox';

export interface PermissionRule {
  tool: string;
  action: 'allow' | 'deny';
  conditions?: PermissionCondition[];
}

export interface PermissionCondition {
  type: 'param' | 'path' | 'command';
  key?: string;
  value?: string | RegExp;
  operator?: 'equals' | 'contains' | 'matches' | 'starts_with' | 'ends_with';
}

export interface PermissionConfig {
  mode: PermissionMode;
  rules: PermissionRule[];
  defaultAction: 'allow' | 'deny';
  autoApprovePatterns?: Array<{ tool: string; pattern: RegExp }>;
  sandboxPaths?: string[];
}

export interface PermissionRequest {
  tool: string;
  params: any;
  timestamp: number;
}

export interface PermissionDecision {
  granted: boolean;
  reason: string;
  cached: boolean;
}

// ============================================
// Permission Manager Implementation
// ============================================

export class PermissionManager extends EventEmitter {
  private config: PermissionConfig;
  private decisionCache: Map<string, PermissionDecision> = new Map();
  private pendingRequests: Map<string, (decision: PermissionDecision) => void> = new Map();
  private rl: readline.Interface | null = null;

  constructor(config: Partial<PermissionConfig> = {}) {
    super();

    this.config = {
      mode: 'interactive',
      rules: [],
      defaultAction: 'deny',
      autoApprovePatterns: [],
      sandboxPaths: [],
      ...config,
    };

    // Initialize readline for interactive mode
    if (this.config.mode === 'interactive') {
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
    }
  }

  // ============================================
  // Core Permission Check
  // ============================================

  /**
   * Check if tool execution is permitted
   */
  async checkPermission(tool: string, params: any): Promise<PermissionDecision> {
    const request: PermissionRequest = {
      tool,
      params,
      timestamp: Date.now(),
    };

    // Emit check event
    this.emit('permission_check', request);

    // Check cache first
    const cacheKey = this.getCacheKey(tool, params);
    const cachedDecision = this.decisionCache.get(cacheKey);

    if (cachedDecision) {
      this.emit('permission_cached', { request, decision: cachedDecision });
      return cachedDecision;
    }

    // Check based on mode
    let decision: PermissionDecision;

    switch (this.config.mode) {
      case 'allow':
        decision = await this.checkAllowMode(tool, params);
        break;

      case 'deny':
        decision = await this.checkDenyMode(tool, params);
        break;

      case 'interactive':
        decision = await this.checkInteractiveMode(tool, params);
        break;

      case 'sandbox':
        decision = await this.checkSandboxMode(tool, params);
        break;

      default:
        decision = {
          granted: false,
          reason: `Unknown permission mode: ${this.config.mode}`,
          cached: false,
        };
    }

    // Cache decision
    this.decisionCache.set(cacheKey, decision);

    // Emit decision event
    this.emit('permission_decision', { request, decision });

    return decision;
  }

  // ============================================
  // Permission Modes
  // ============================================

  /**
   * Allow mode - allow everything unless explicitly denied
   */
  private async checkAllowMode(tool: string, params: any): Promise<PermissionDecision> {
    // Check explicit deny rules
    const denyRule = this.findMatchingRule(tool, params, 'deny');

    if (denyRule) {
      return {
        granted: false,
        reason: `Denied by rule: ${JSON.stringify(denyRule.conditions)}`,
        cached: false,
      };
    }

    return {
      granted: true,
      reason: 'Allowed by default (allow mode)',
      cached: false,
    };
  }

  /**
   * Deny mode - deny everything unless explicitly allowed
   */
  private async checkDenyMode(tool: string, params: any): Promise<PermissionDecision> {
    // Check explicit allow rules
    const allowRule = this.findMatchingRule(tool, params, 'allow');

    if (allowRule) {
      return {
        granted: true,
        reason: `Allowed by rule: ${JSON.stringify(allowRule.conditions)}`,
        cached: false,
      };
    }

    return {
      granted: false,
      reason: 'Denied by default (deny mode)',
      cached: false,
    };
  }

  /**
   * Interactive mode - ask user for permission
   */
  private async checkInteractiveMode(tool: string, params: any): Promise<PermissionDecision> {
    // Check auto-approve patterns
    if (this.isAutoApproved(tool, params)) {
      return {
        granted: true,
        reason: 'Auto-approved by pattern',
        cached: false,
      };
    }

    // Check explicit rules first
    const explicitRule = this.findMatchingRule(tool, params, 'allow') ||
                         this.findMatchingRule(tool, params, 'deny');

    if (explicitRule) {
      return {
        granted: explicitRule.action === 'allow',
        reason: `${explicitRule.action === 'allow' ? 'Allowed' : 'Denied'} by rule`,
        cached: false,
      };
    }

    // Ask user interactively
    return await this.askUser(tool, params);
  }

  /**
   * Sandbox mode - restricted execution with path validation
   */
  private async checkSandboxMode(tool: string, params: any): Promise<PermissionDecision> {
    // Check if tool is allowed in sandbox
    const sandboxAllowedTools = ['Read', 'Write', 'Edit', 'Glob', 'Grep'];

    if (!sandboxAllowedTools.includes(tool)) {
      return {
        granted: false,
        reason: `Tool ${tool} not allowed in sandbox mode`,
        cached: false,
      };
    }

    // Validate paths for file operations
    if (['Read', 'Write', 'Edit'].includes(tool)) {
      const pathValidation = this.validateSandboxPath(params.file_path || params.path);

      if (!pathValidation.valid) {
        return {
          granted: false,
          reason: pathValidation.reason,
          cached: false,
        };
      }
    }

    // Validate command for Bash tool
    if (tool === 'Bash') {
      const cmdValidation = this.validateSandboxCommand(params.command);

      if (!cmdValidation.valid) {
        return {
          granted: false,
          reason: cmdValidation.reason,
          cached: false,
        };
      }
    }

    return {
      granted: true,
      reason: 'Allowed in sandbox mode',
      cached: false,
    };
  }

  // ============================================
  // Interactive User Prompt
  // ============================================

  /**
   * Ask user for permission interactively
   */
  private async askUser(tool: string, params: any): Promise<PermissionDecision> {
    return new Promise((resolve) => {
      if (!this.rl) {
        resolve({
          granted: false,
          reason: 'Interactive mode not available',
          cached: false,
        });
        return;
      }

      console.log('\n========================================');
      console.log('Permission Request');
      console.log('========================================');
      console.log(`Tool: ${tool}`);
      console.log(`Parameters:`);
      console.log(JSON.stringify(params, null, 2));
      console.log('========================================');
      console.log('Options:');
      console.log('  [y] Yes, allow once');
      console.log('  [Y] Yes, always allow this tool');
      console.log('  [n] No, deny once');
      console.log('  [N] No, always deny this tool');
      console.log('  [s] Show full details');
      console.log('========================================');

      this.rl.question('Your choice: ', (answer: string) => {
        const choice = answer.trim().toLowerCase();

        switch (choice) {
          case 'y':
            resolve({
              granted: true,
              reason: 'Allowed by user (once)',
              cached: false,
            });
            break;

          case 'yes':
            this.addRule({
              tool,
              action: 'allow',
            });
            resolve({
              granted: true,
              reason: 'Allowed by user (always)',
              cached: false,
            });
            break;

          case 'n':
            resolve({
              granted: false,
              reason: 'Denied by user (once)',
              cached: false,
            });
            break;

          case 'no':
            this.addRule({
              tool,
              action: 'deny',
            });
            resolve({
              granted: false,
              reason: 'Denied by user (always)',
              cached: false,
            });
            break;

          case 's':
            console.log('\nFull Parameter Details:');
            console.log(JSON.stringify(params, null, 2));
            // Recursively ask again
            this.askUser(tool, params).then(resolve);
            break;

          default:
            console.log('Invalid choice, denying by default');
            resolve({
              granted: false,
              reason: 'Invalid user input',
              cached: false,
            });
        }
      });
    });
  }

  // ============================================
  // Rule Management
  // ============================================

  /**
   * Add a permission rule
   */
  addRule(rule: PermissionRule): void {
    this.config.rules.push(rule);
    this.emit('rule_added', rule);

    // Clear cache when rules change
    this.clearCache();
  }

  /**
   * Remove a permission rule
   */
  removeRule(index: number): boolean {
    if (index >= 0 && index < this.config.rules.length) {
      const removed = this.config.rules.splice(index, 1)[0];
      this.emit('rule_removed', removed);

      // Clear cache when rules change
      this.clearCache();

      return true;
    }

    return false;
  }

  /**
   * Get all rules
   */
  getRules(): PermissionRule[] {
    return [...this.config.rules];
  }

  /**
   * Clear all rules
   */
  clearRules(): void {
    this.config.rules = [];
    this.clearCache();
    this.emit('rules_cleared');
  }

  /**
   * Find matching rule
   */
  private findMatchingRule(
    tool: string,
    params: any,
    action: 'allow' | 'deny'
  ): PermissionRule | null {
    for (const rule of this.config.rules) {
      if (rule.tool !== tool || rule.action !== action) {
        continue;
      }

      // If no conditions, rule matches
      if (!rule.conditions || rule.conditions.length === 0) {
        return rule;
      }

      // Check all conditions
      const allConditionsMatch = rule.conditions.every(condition => {
        return this.evaluateCondition(condition, params);
      });

      if (allConditionsMatch) {
        return rule;
      }
    }

    return null;
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(condition: PermissionCondition, params: any): boolean {
    switch (condition.type) {
      case 'param':
        if (!condition.key) return false;

        const value = this.getNestedValue(params, condition.key);

        if (value === undefined) return false;

        switch (condition.operator) {
          case 'equals':
            return value === condition.value;

          case 'contains':
            return String(value).includes(String(condition.value));

          case 'matches':
            if (condition.value instanceof RegExp) {
              return condition.value.test(String(value));
            }
            return false;

          case 'starts_with':
            return String(value).startsWith(String(condition.value));

          case 'ends_with':
            return String(value).endsWith(String(condition.value));

          default:
            return false;
        }

      case 'path':
        // Check if any path parameter matches
        const pathParams = ['file_path', 'path', 'directory'];
        for (const param of pathParams) {
          if (params[param]) {
            const path = params[param];
            if (condition.value instanceof RegExp) {
              if (condition.value.test(path)) return true;
            } else {
              if (path.includes(String(condition.value))) return true;
            }
          }
        }
        return false;

      case 'command':
        if (params.command) {
          if (condition.value instanceof RegExp) {
            return condition.value.test(params.command);
          } else {
            return params.command.includes(String(condition.value));
          }
        }
        return false;

      default:
        return false;
    }
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: any, key: string): any {
    const keys = key.split('.');
    let value = obj;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return undefined;
      }
    }

    return value;
  }

  // ============================================
  // Sandbox Validation
  // ============================================

  /**
   * Validate path for sandbox mode
   */
  private validateSandboxPath(path: string): { valid: boolean; reason?: string } {
    if (!this.config.sandboxPaths || this.config.sandboxPaths.length === 0) {
      return {
        valid: false,
        reason: 'No sandbox paths configured',
      };
    }

    const normalizedPath = this.normalizePath(path);

    for (const allowedPath of this.config.sandboxPaths) {
      const normalizedAllowed = this.normalizePath(allowedPath);

      if (normalizedPath.startsWith(normalizedAllowed)) {
        return { valid: true };
      }
    }

    return {
      valid: false,
      reason: `Path ${path} is outside sandbox boundaries`,
    };
  }

  /**
   * Validate command for sandbox mode
   */
  private validateSandboxCommand(command: string): { valid: boolean; reason?: string } {
    // List of allowed commands in sandbox
    const allowedCommands = [
      'ls', 'cat', 'echo', 'pwd', 'grep', 'find', 'wc', 'head', 'tail',
      'sort', 'uniq', 'cut', 'awk', 'sed',
    ];

    const firstWord = command.trim().split(/\s+/)[0];

    if (allowedCommands.includes(firstWord)) {
      return { valid: true };
    }

    return {
      valid: false,
      reason: `Command ${firstWord} not allowed in sandbox`,
    };
  }

  /**
   * Normalize path for comparison
   */
  private normalizePath(path: string): string {
    return path.replace(/\\/g, '/').replace(/\/+/g, '/').toLowerCase();
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Check if tool/params match auto-approve pattern
   */
  private isAutoApproved(tool: string, params: any): boolean {
    if (!this.config.autoApprovePatterns) {
      return false;
    }

    for (const pattern of this.config.autoApprovePatterns) {
      if (pattern.tool === tool) {
        const paramsStr = JSON.stringify(params);
        if (pattern.pattern.test(paramsStr)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Get cache key for tool/params
   */
  private getCacheKey(tool: string, params: any): string {
    return `${tool}:${JSON.stringify(params)}`;
  }

  /**
   * Clear decision cache
   */
  clearCache(): void {
    this.decisionCache.clear();
    this.emit('cache_cleared');
  }

  /**
   * Set permission mode
   */
  setMode(mode: PermissionMode): void {
    this.config.mode = mode;
    this.clearCache();
    this.emit('mode_changed', mode);
  }

  /**
   * Get current mode
   */
  getMode(): PermissionMode {
    return this.config.mode;
  }

  /**
   * Set sandbox paths
   */
  setSandboxPaths(paths: string[]): void {
    this.config.sandboxPaths = paths;
    this.clearCache();
    this.emit('sandbox_paths_updated', paths);
  }

  /**
   * Get permission statistics
   */
  getStats(): {
    mode: PermissionMode;
    rulesCount: number;
    cacheSize: number;
  } {
    return {
      mode: this.config.mode,
      rulesCount: this.config.rules.length,
      cacheSize: this.decisionCache.size,
    };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.rl) {
      this.rl.close();
      this.rl = null;
    }

    this.clearCache();
    this.removeAllListeners();
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Create permission manager with default configuration
 */
export function createPermissionManager(
  config: Partial<PermissionConfig> = {}
): PermissionManager {
  return new PermissionManager(config);
}
