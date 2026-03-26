/**
 * Configuration Manager - Complete Implementation
 *
 * Restored from Bun 2.1.83 binary
 * Manages agent configuration, CLAUDE.md parsing, environment variables
 */

import { EventEmitter } from 'events';
import * as path from 'path';
import * as fs from 'fs';

// ============================================
// Type Definitions
// ============================================

export interface LLMConfig {
  model: string;
  maxTokens: number;
  temperature?: number;
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
}

export interface PermissionConfig {
  mode: 'allow' | 'deny' | 'interactive' | 'sandbox';
  rules?: PermissionRule[];
  sandboxPaths?: string[];
}

export interface PermissionRule {
  tool: string;
  action: 'allow' | 'deny';
  conditions?: any[];
}

export interface SessionConfig {
  maxMessages?: number;
  maxTokens?: number;
  compressionThreshold?: number;
  persistenceEnabled?: boolean;
  persistencePath?: string;
}

export interface AgentConfig {
  llm: LLMConfig;
  permissions: PermissionConfig;
  session: SessionConfig;
  projectContext?: ProjectContext;
}

export interface ProjectContext {
  name?: string;
  description?: string;
  instructions?: string[];
  conventions?: string[];
  dependencies?: string[];
}

export interface ClaudeMdConfig {
  projectContext?: ProjectContext;
  llmOverrides?: Partial<LLMConfig>;
  permissionOverrides?: Partial<PermissionConfig>;
  sessionOverrides?: Partial<SessionConfig>;
}

// ============================================
// Configuration Manager Implementation
// ============================================

export class ConfigurationManager extends EventEmitter {
  private config: AgentConfig;
  private configPath: string;
  private claudeMdPath: string;
  private envPrefix: string = 'CLAUDE_CODE_';

  constructor(workingDirectory: string = process.cwd()) {
    super();

    this.configPath = path.join(workingDirectory, '.claude', 'config.json');
    this.claudeMdPath = path.join(workingDirectory, '.claude', 'CLAUDE.md');

    // Initialize with defaults
    this.config = this.getDefaultConfig();

    // Load configuration
    this.loadConfiguration();
  }

  // ============================================
  // Configuration Loading
  // ============================================

  /**
   * Load configuration from all sources
   * Priority: Environment > CLAUDE.md > config.json > defaults
   */
  private loadConfiguration(): void {
    // 1. Load from config.json
    this.loadFromConfigFile();

    // 2. Load from CLAUDE.md
    this.loadFromClaudeMd();

    // 3. Load from environment variables
    this.loadFromEnvironment();

    this.emit('configuration_loaded', this.config);
  }

  /**
   * Load from config.json file
   */
  private loadFromConfigFile(): void {
    try {
      const file = Bun.file(this.configPath);

      if (!file.exists()) {
        return;
      }

      const content = file.text();
      const config = JSON.parse(content as any);

      this.mergeConfig(config);

      this.emit('config_file_loaded', this.configPath);

    } catch (error: any) {
      this.emit('config_file_error', {
        path: this.configPath,
        error: error.message,
      });
    }
  }

  /**
   * Load from CLAUDE.md file
   */
  private loadFromClaudeMd(): void {
    try {
      const file = Bun.file(this.claudeMdPath);

      if (!file.exists()) {
        return;
      }

      const content = file.text() as any;
      const parsed = this.parseClaudeMd(content);

      // Apply CLAUDE.md overrides
      if (parsed.projectContext) {
        this.config.projectContext = parsed.projectContext;
      }

      if (parsed.llmOverrides) {
        Object.assign(this.config.llm, parsed.llmOverrides);
      }

      if (parsed.permissionOverrides) {
        Object.assign(this.config.permissions, parsed.permissionOverrides);
      }

      if (parsed.sessionOverrides) {
        Object.assign(this.config.session, parsed.sessionOverrides);
      }

      this.emit('claude_md_loaded', this.claudeMdPath);

    } catch (error: any) {
      this.emit('claude_md_error', {
        path: this.claudeMdPath,
        error: error.message,
      });
    }
  }

  /**
   * Parse CLAUDE.md content
   */
  private parseClaudeMd(content: string): ClaudeMdConfig {
    const result: ClaudeMdConfig = {
      projectContext: {},
    };

    const lines = content.split('\n');
    let currentSection = '';
    let sectionContent: string[] = [];

    for (const line of lines) {
      // Detect section headers
      if (line.startsWith('## ')) {
        // Save previous section
        this.processSection(currentSection, sectionContent, result);

        // Start new section
        currentSection = line.slice(3).trim().toLowerCase();
        sectionContent = [];
      } else {
        sectionContent.push(line);
      }
    }

    // Process last section
    this.processSection(currentSection, sectionContent, result);

    return result;
  }

  /**
   * Process a CLAUDE.md section
   */
  private processSection(
    section: string,
    content: string[],
    result: ClaudeMdConfig
  ): void {
    if (!section || content.length === 0) {
      return;
    }

    const text = content.join('\n').trim();

    switch (section) {
      case 'project context':
      case 'project':
        result.projectContext = {
          description: text,
        };
        break;

      case 'instructions':
        result.projectContext!.instructions = text
          .split('\n')
          .filter(line => line.trim().startsWith('-') || line.trim().startsWith('*'))
          .map(line => line.replace(/^[\-\*]\s*/, '').trim());
        break;

      case 'conventions':
      case 'coding conventions':
        result.projectContext!.conventions = text
          .split('\n')
          .filter(line => line.trim().startsWith('-') || line.trim().startsWith('*'))
          .map(line => line.replace(/^[\-\*]\s*/, '').trim());
        break;

      case 'dependencies':
        result.projectContext!.dependencies = text
          .split('\n')
          .filter(line => line.trim().startsWith('-') || line.trim().startsWith('*'))
          .map(line => line.replace(/^[\-\*]\s*/, '').trim());
        break;

      case 'llm configuration':
      case 'llm config':
        result.llmOverrides = this.parseConfigBlock(text);
        break;

      case 'permission configuration':
      case 'permissions':
        result.permissionOverrides = this.parseConfigBlock(text);
        break;

      case 'session configuration':
      case 'session config':
        result.sessionOverrides = this.parseConfigBlock(text);
        break;
    }
  }

  /**
   * Parse configuration block (key-value pairs)
   */
  private parseConfigBlock(text: string): any {
    const config: any = {};
    const lines = text.split('\n');

    for (const line of lines) {
      const match = line.match(/^[\-\*]\s*(.+?):\s*(.+)$/);

      if (match) {
        const [, key, value] = match;

        // Parse value
        let parsedValue: any = value.trim();

        // Try to parse as number
        if (/^\d+$/.test(parsedValue)) {
          parsedValue = parseInt(parsedValue, 10);
        } else if (/^\d+\.\d+$/.test(parsedValue)) {
          parsedValue = parseFloat(parsedValue);
        } else if (parsedValue === 'true') {
          parsedValue = true;
        } else if (parsedValue === 'false') {
          parsedValue = false;
        }

        config[key.trim()] = parsedValue;
      }
    }

    return config;
  }

  /**
   * Load from environment variables
   */
  private loadFromEnvironment(): void {
    // LLM Configuration
    this.loadEnvVar('API_KEY', 'llm.apiKey');
    this.loadEnvVar('MODEL', 'llm.model');
    this.loadEnvVar('MAX_TOKENS', 'llm.maxTokens', 'number');
    this.loadEnvVar('TEMPERATURE', 'llm.temperature', 'number');
    this.loadEnvVar('BASE_URL', 'llm.baseUrl');
    this.loadEnvVar('TIMEOUT', 'llm.timeout', 'number');

    // Permission Configuration
    this.loadEnvVar('PERMISSION_MODE', 'permissions.mode');
    this.loadEnvVar('SANDBOX_PATHS', 'permissions.sandboxPaths', 'array');

    // Session Configuration
    this.loadEnvVar('MAX_MESSAGES', 'session.maxMessages', 'number');
    this.loadEnvVar('SESSION_TOKENS', 'session.maxTokens', 'number');
    this.loadEnvVar('COMPRESSION_THRESHOLD', 'session.compressionThreshold', 'number');
    this.loadEnvVar('PERSISTENCE_ENABLED', 'session.persistenceEnabled', 'boolean');
    this.loadEnvVar('PERSISTENCE_PATH', 'session.persistencePath');

    this.emit('environment_loaded');
  }

  /**
   * Load single environment variable
   */
  private loadEnvVar(
    envName: string,
    configPath: string,
    type: 'string' | 'number' | 'boolean' | 'array' = 'string'
  ): void {
    const fullEnvName = `${this.envPrefix}${envName}`;
    const value = process.env[fullEnvName];

    if (value === undefined) {
      return;
    }

    let parsedValue: any;

    switch (type) {
      case 'number':
        parsedValue = parseInt(value, 10);
        if (isNaN(parsedValue)) {
          return;
        }
        break;

      case 'boolean':
        parsedValue = value.toLowerCase() === 'true';
        break;

      case 'array':
        parsedValue = value.split(',').map(s => s.trim());
        break;

      default:
        parsedValue = value;
    }

    // Set nested config value
    this.setNestedValue(this.config, configPath, parsedValue);

    this.emit('env_var_loaded', {
      name: fullEnvName,
      path: configPath,
      value: parsedValue,
    });
  }

  /**
   * Set nested object value using path
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];

      if (!(key in current)) {
        current[key] = {};
      }

      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  }

  /**
   * Get nested object value using path
   */
  private getNestedValue(obj: any, path: string): any {
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }

    return current;
  }

  /**
   * Merge configuration
   */
  private mergeConfig(newConfig: Partial<AgentConfig>): void {
    if (newConfig.llm) {
      Object.assign(this.config.llm, newConfig.llm);
    }

    if (newConfig.permissions) {
      Object.assign(this.config.permissions, newConfig.permissions);
    }

    if (newConfig.session) {
      Object.assign(this.config.session, newConfig.session);
    }

    if (newConfig.projectContext) {
      this.config.projectContext = newConfig.projectContext;
    }
  }

  // ============================================
  // Configuration Access
  // ============================================

  /**
   * Get complete configuration
   */
  getConfig(): AgentConfig {
    return JSON.parse(JSON.stringify(this.config));
  }

  /**
   * Get LLM configuration
   */
  getLLMConfig(): LLMConfig {
    return { ...this.config.llm };
  }

  /**
   * Get permission configuration
   */
  getPermissionConfig(): PermissionConfig {
    return { ...this.config.permissions };
  }

  /**
   * Get session configuration
   */
  getSessionConfig(): SessionConfig {
    return { ...this.config.session };
  }

  /**
   * Get project context
   */
  getProjectContext(): ProjectContext | undefined {
    return this.config.projectContext
      ? { ...this.config.projectContext }
      : undefined;
  }

  // ============================================
  // Configuration Updates
  // ============================================

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<AgentConfig>): void {
    this.mergeConfig(updates);
    this.emit('configuration_updated', updates);
  }

  /**
   * Update LLM configuration
   */
  updateLLMConfig(updates: Partial<LLMConfig>): void {
    Object.assign(this.config.llm, updates);
    this.emit('llm_config_updated', updates);
  }

  /**
   * Update permission configuration
   */
  updatePermissionConfig(updates: Partial<PermissionConfig>): void {
    Object.assign(this.config.permissions, updates);
    this.emit('permission_config_updated', updates);
  }

  /**
   * Update session configuration
   */
  updateSessionConfig(updates: Partial<SessionConfig>): void {
    Object.assign(this.config.session, updates);
    this.emit('session_config_updated', updates);
  }

  // ============================================
  // Configuration Persistence
  // ============================================

  /**
   * Save configuration to file
   */
  async saveConfig(): Promise<void> {
    const dir = path.dirname(this.configPath);

    // Ensure directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const content = JSON.stringify(this.config, null, 2);
    await Bun.write(this.configPath, content);

    this.emit('configuration_saved', this.configPath);
  }

  /**
   * Reload configuration from files
   */
  reloadConfig(): void {
    this.config = this.getDefaultConfig();
    this.loadConfiguration();
    this.emit('configuration_reloaded');
  }

  /**
   * Reset to defaults
   */
  resetToDefaults(): void {
    this.config = this.getDefaultConfig();
    this.emit('configuration_reset');
  }

  // ============================================
  // Default Configuration
  // ============================================

  /**
   * Get default configuration
   */
  private getDefaultConfig(): AgentConfig {
    return {
      llm: {
        model: 'claude-sonnet-4-6',
        maxTokens: 8192,
        temperature: 0.7,
        timeout: 120000,
      },
      permissions: {
        mode: 'interactive',
        rules: [],
        sandboxPaths: [],
      },
      session: {
        maxMessages: 100,
        maxTokens: 100000,
        compressionThreshold: 0.8,
        persistenceEnabled: false,
      },
      projectContext: undefined,
    };
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Validate configuration
   */
  validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate LLM config
    if (!this.config.llm.model) {
      errors.push('LLM model is required');
    }

    if (this.config.llm.maxTokens <= 0) {
      errors.push('LLM maxTokens must be positive');
    }

    if (this.config.llm.temperature !== undefined) {
      if (this.config.llm.temperature < 0 || this.config.llm.temperature > 1) {
        errors.push('LLM temperature must be between 0 and 1');
      }
    }

    // Validate permission config
    const validModes = ['allow', 'deny', 'interactive', 'sandbox'];
    if (!validModes.includes(this.config.permissions.mode)) {
      errors.push(`Invalid permission mode: ${this.config.permissions.mode}`);
    }

    // Validate session config
    if (this.config.session.maxMessages !== undefined) {
      if (this.config.session.maxMessages <= 0) {
        errors.push('Session maxMessages must be positive');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get configuration summary
   */
  getSummary(): string {
    const lines = [
      'Configuration Summary',
      '===================',
      '',
      'LLM:',
      `  Model: ${this.config.llm.model}`,
      `  Max Tokens: ${this.config.llm.maxTokens}`,
      `  Temperature: ${this.config.llm.temperature}`,
      '',
      'Permissions:',
      `  Mode: ${this.config.permissions.mode}`,
      `  Rules: ${this.config.permissions.rules?.length || 0}`,
      '',
      'Session:',
      `  Max Messages: ${this.config.session.maxMessages}`,
      `  Max Tokens: ${this.config.session.maxTokens}`,
      `  Persistence: ${this.config.session.persistenceEnabled}`,
    ];

    if (this.config.projectContext) {
      lines.push('', 'Project Context:');
      if (this.config.projectContext.description) {
        lines.push(`  ${this.config.projectContext.description.slice(0, 100)}...`);
      }
    }

    return lines.join('\n');
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Create configuration manager
 */
export function createConfigurationManager(
  workingDirectory?: string
): ConfigurationManager {
  return new ConfigurationManager(workingDirectory);
}

/**
 * Load configuration quickly
 */
export function loadConfig(workingDirectory?: string): AgentConfig {
  const manager = new ConfigurationManager(workingDirectory);
  return manager.getConfig();
}
