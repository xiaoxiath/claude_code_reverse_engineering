/**
 * Memory Manager - Complete Implementation
 *
 * Restored from Bun 2.1.83 binary
 * Manages persistent memory, MEMORY.md parsing, and context management
 */

import { EventEmitter } from 'events';
import * as path from 'path';
import * as fs from 'fs';

// ============================================
// Type Definitions
// ============================================

export type MemoryType = 'user' | 'feedback' | 'project' | 'reference';

export interface MemoryEntry {
  name: string;
  description: string;
  type: MemoryType;
  content: string;
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, any>;
}

export interface MemoryConfig {
  memoryDirectory: string;
  memoryFile: string;
  maxMemories: number;
  maxMemorySize: number; // in bytes
  autoCompress: boolean;
  compressionThreshold: number; // percentage
}

export interface MemoryIndex {
  entries: string[]; // memory names
  totalSize: number;
  lastUpdated: number;
}

// ============================================
// Memory Manager Implementation
// ============================================

export class MemoryManager extends EventEmitter {
  private config: MemoryConfig;
  private memories: Map<string, MemoryEntry> = new Map();
  private memoryIndexPath: string;
  private memoryFilePath: string;

  constructor(config: Partial<MemoryConfig> = {}) {
    super();

    this.config = {
      memoryDirectory: '.claude/projects',
      memoryFile: 'MEMORY.md',
      maxMemories: 100,
      maxMemorySize: 1024 * 1024, // 1MB
      autoCompress: true,
      compressionThreshold: 0.8,
      ...config,
    };

    this.memoryIndexPath = path.join(
      this.config.memoryDirectory,
      'memory_index.json'
    );
    this.memoryFilePath = path.join(
      this.config.memoryDirectory,
      this.config.memoryFile
    );

    // Load existing memories
    this.loadMemories();
  }

  // ============================================
  // Memory Operations
  // ============================================

  /**
   * Add a new memory
   */
  addMemory(memory: Omit<MemoryEntry, 'createdAt' | 'updatedAt'>): MemoryEntry {
    // Check if memory already exists
    if (this.memories.has(memory.name)) {
      return this.updateMemory(memory.name, memory);
    }

    // Create new memory entry
    const entry: MemoryEntry = {
      ...memory,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.memories.set(memory.name, entry);

    // Check capacity
    if (this.memories.size > this.config.maxMemories) {
      this.compressMemories();
    }

    this.emit('memory_added', entry);

    return entry;
  }

  /**
   * Update existing memory
   */
  updateMemory(name: string, updates: Partial<MemoryEntry>): MemoryEntry {
    const existing = this.memories.get(name);

    if (!existing) {
      throw new Error(`Memory not found: ${name}`);
    }

    const updated: MemoryEntry = {
      ...existing,
      ...updates,
      updatedAt: Date.now(),
    };

    this.memories.set(name, updated);

    this.emit('memory_updated', { old: existing, new: updated });

    return updated;
  }

  /**
   * Get memory by name
   */
  getMemory(name: string): MemoryEntry | null {
    return this.memories.get(name) || null;
  }

  /**
   * Get memories by type
   */
  getMemoriesByType(type: MemoryType): MemoryEntry[] {
    const result: MemoryEntry[] = [];

    for (const memory of this.memories.values()) {
      if (memory.type === type) {
        result.push(memory);
      }
    }

    return result;
  }

  /**
   * Get all memories
   */
  getAllMemories(): MemoryEntry[] {
    return Array.from(this.memories.values());
  }

  /**
   * Delete memory
   */
  deleteMemory(name: string): boolean {
    const memory = this.memories.get(name);

    if (!memory) {
      return false;
    }

    this.memories.delete(name);

    this.emit('memory_deleted', memory);

    return true;
  }

  /**
   * Search memories
   */
  searchMemories(query: string): MemoryEntry[] {
    const lowerQuery = query.toLowerCase();
    const results: MemoryEntry[] = [];

    for (const memory of this.memories.values()) {
      if (
        memory.name.toLowerCase().includes(lowerQuery) ||
        memory.description.toLowerCase().includes(lowerQuery) ||
        memory.content.toLowerCase().includes(lowerQuery)
      ) {
        results.push(memory);
      }
    }

    return results;
  }

  // ============================================
  // Memory Compression
  // ============================================

  /**
   * Compress memories to stay within limits
   */
  compressMemories(): void {
    if (!this.config.autoCompress) {
      return;
    }

    const totalSize = this.getTotalSize();
    const maxSize = this.config.maxMemorySize;

    if (totalSize < maxSize * this.config.compressionThreshold) {
      return;
    }

    // Sort by last updated (oldest first)
    const sortedMemories = Array.from(this.memories.values())
      .sort((a, b) => a.updatedAt - b.updatedAt);

    let currentSize = totalSize;
    const toRemove: MemoryEntry[] = [];

    // Remove oldest memories until under threshold
    for (const memory of sortedMemories) {
      if (currentSize < maxSize * 0.7) {
        break;
      }

      const memorySize = this.getMemorySize(memory);

      // Don't remove user memories unless absolutely necessary
      if (memory.type !== 'user' || currentSize > maxSize * 0.9) {
        toRemove.push(memory);
        currentSize -= memorySize;
      }
    }

    // Remove selected memories
    for (const memory of toRemove) {
      this.memories.delete(memory.name);
      this.emit('memory_compressed', memory);
    }

    this.emit('memories_compressed', {
      removed: toRemove.length,
      sizeBefore: totalSize,
      sizeAfter: currentSize,
    });
  }

  /**
   * Get total size of all memories
   */
  private getTotalSize(): number {
    let total = 0;

    for (const memory of this.memories.values()) {
      total += this.getMemorySize(memory);
    }

    return total;
  }

  /**
   * Get size of a single memory
   */
  private getMemorySize(memory: MemoryEntry): number {
    return JSON.stringify(memory).length;
  }

  // ============================================
  // MEMORY.md Parsing
  // ============================================

  /**
   * Parse MEMORY.md file
   */
  private parseMemoryMd(content: string): void {
    const lines = content.split('\n');
    let currentMemory: Partial<MemoryEntry> | null = null;
    let inFrontmatter = false;
    let frontmatterLines: string[] = [];
    let contentLines: string[] = [];

    for (const line of lines) {
      // Detect frontmatter start/end
      if (line === '---') {
        if (!inFrontmatter) {
          inFrontmatter = true;
          frontmatterLines = [];
          continue;
        } else {
          // End of frontmatter
          inFrontmatter = false;
          currentMemory = this.parseFrontmatter(frontmatterLines);
          contentLines = [];
          continue;
        }
      }

      // Inside frontmatter
      if (inFrontmatter) {
        frontmatterLines.push(line);
        continue;
      }

      // Outside frontmatter - content
      if (currentMemory) {
        contentLines.push(line);

        // Check for memory boundary (new frontmatter starting)
        if (line.startsWith('---') && contentLines.length === 1) {
          // Save previous memory
          if (currentMemory.name) {
            currentMemory.content = contentLines.slice(0, -1).join('\n').trim();
            this.memories.set(currentMemory.name, currentMemory as MemoryEntry);
          }

          // Start new memory
          currentMemory = null;
          inFrontmatter = true;
          frontmatterLines = [];
          contentLines = [];
        }
      }
    }

    // Save last memory
    if (currentMemory && currentMemory.name) {
      currentMemory.content = contentLines.join('\n').trim();
      this.memories.set(currentMemory.name, currentMemory as MemoryEntry);
    }
  }

  /**
   * Parse frontmatter
   */
  private parseFrontmatter(lines: string[]): Partial<MemoryEntry> {
    const memory: Partial<MemoryEntry> = {};

    for (const line of lines) {
      const match = line.match(/^(\w+):\s*(.+)$/);

      if (match) {
        const [, key, value] = match;

        switch (key) {
          case 'name':
            memory.name = value;
            break;

          case 'description':
            memory.description = value;
            break;

          case 'type':
            memory.type = value as MemoryType;
            break;

          case 'createdAt':
            memory.createdAt = parseInt(value, 10);
            break;

          case 'updatedAt':
            memory.updatedAt = parseInt(value, 10);
            break;

          default:
            // Store in metadata
            if (!memory.metadata) {
              memory.metadata = {};
            }
            memory.metadata[key] = value;
        }
      }
    }

    return memory;
  }

  /**
   * Generate MEMORY.md content
   */
  private generateMemoryMd(): string {
    const sections: string[] = [];

    for (const memory of this.memories.values()) {
      sections.push(this.formatMemorySection(memory));
    }

    return sections.join('\n\n---\n\n');
  }

  /**
   * Format single memory section
   */
  private formatMemorySection(memory: MemoryEntry): string {
    const frontmatter = [
      '---',
      `name: ${memory.name}`,
      `description: ${memory.description}`,
      `type: ${memory.type}`,
      `createdAt: ${memory.createdAt}`,
      `updatedAt: ${memory.updatedAt}`,
    ];

    if (memory.metadata) {
      for (const [key, value] of Object.entries(memory.metadata)) {
        frontmatter.push(`${key}: ${value}`);
      }
    }

    frontmatter.push('---');

    return frontmatter.join('\n') + '\n\n' + memory.content;
  }

  // ============================================
  // Persistence
  // ============================================

  /**
   * Load memories from disk
   */
  private loadMemories(): void {
    // Try to load from MEMORY.md first
    try {
      const file = Bun.file(this.memoryFilePath);

      if (file.exists()) {
        const content = file.text() as any;
        this.parseMemoryMd(content);
        this.emit('memories_loaded', { source: 'MEMORY.md', count: this.memories.size });
        return;
      }
    } catch (error: any) {
      this.emit('load_error', { source: 'MEMORY.md', error: error.message });
    }

    // Try to load from index
    try {
      const indexFile = Bun.file(this.memoryIndexPath);

      if (indexFile.exists()) {
        const indexData = JSON.parse(indexFile.text() as any);
        // Load individual memory files
        for (const name of indexData.entries) {
          const memoryPath = path.join(this.config.memoryDirectory, `${name}.json`);
          const memoryFile = Bun.file(memoryPath);

          if (memoryFile.exists()) {
            const memory = JSON.parse(memoryFile.text() as any);
            this.memories.set(name, memory);
          }
        }

        this.emit('memories_loaded', { source: 'index', count: this.memories.size });
      }
    } catch (error: any) {
      this.emit('load_error', { source: 'index', error: error.message });
    }
  }

  /**
   * Save memories to disk
   */
  async saveMemories(): Promise<void> {
    // Ensure directory exists
    if (!fs.existsSync(this.config.memoryDirectory)) {
      fs.mkdirSync(this.config.memoryDirectory, { recursive: true });
    }

    // Save to MEMORY.md
    const content = this.generateMemoryMd();
    await Bun.write(this.memoryFilePath, content);

    // Update index
    const index: MemoryIndex = {
      entries: Array.from(this.memories.keys()),
      totalSize: this.getTotalSize(),
      lastUpdated: Date.now(),
    };

    await Bun.write(this.memoryIndexPath, JSON.stringify(index, null, 2));

    this.emit('memories_saved', { count: this.memories.size, path: this.memoryFilePath });
  }

  // ============================================
  // Context Building
  // ============================================

  /**
   * Build memory context for prompts
   */
  buildContext(types?: MemoryType[]): string {
    const relevantMemories = types
      ? this.getAllMemories().filter(m => types.includes(m.type))
      : this.getAllMemories();

    if (relevantMemories.length === 0) {
      return '';
    }

    const sections: string[] = ['# Memory Context', ''];

    for (const memory of relevantMemories) {
      sections.push(`## ${memory.name}`);
      sections.push(`Type: ${memory.type}`);
      sections.push(`Description: ${memory.description}`);
      sections.push('');
      sections.push(memory.content);
      sections.push('');
    }

    return sections.join('\n');
  }

  /**
   * Get user context
   */
  getUserContext(): string {
    return this.buildContext(['user']);
  }

  /**
   * Get feedback context
   */
  getFeedbackContext(): string {
    return this.buildContext(['feedback']);
  }

  /**
   * Get project context
   */
  getProjectContext(): string {
    return this.buildContext(['project']);
  }

  // ============================================
  // Utility Methods
  // ============================================

  /**
   * Get memory statistics
   */
  getStats(): {
    totalMemories: number;
    totalSize: number;
    byType: Record<MemoryType, number>;
    oldestMemory: number;
    newestMemory: number;
  } {
    const byType: Record<MemoryType, number> = {
      user: 0,
      feedback: 0,
      project: 0,
      reference: 0,
    };

    let oldestMemory = Date.now();
    let newestMemory = 0;

    for (const memory of this.memories.values()) {
      byType[memory.type]++;

      if (memory.createdAt < oldestMemory) {
        oldestMemory = memory.createdAt;
      }

      if (memory.createdAt > newestMemory) {
        newestMemory = memory.createdAt;
      }
    }

    return {
      totalMemories: this.memories.size,
      totalSize: this.getTotalSize(),
      byType,
      oldestMemory,
      newestMemory,
    };
  }

  /**
   * Clear all memories
   */
  clearMemories(): void {
    this.memories.clear();
    this.emit('memories_cleared');
  }

  /**
   * Export memories
   */
  exportMemories(format: 'json' | 'markdown'): string {
    if (format === 'json') {
      return JSON.stringify(this.getAllMemories(), null, 2);
    } else {
      return this.generateMemoryMd();
    }
  }

  /**
   * Import memories
   */
  importMemories(content: string, format: 'json' | 'markdown'): number {
    let imported = 0;

    if (format === 'json') {
      const memories = JSON.parse(content) as MemoryEntry[];

      for (const memory of memories) {
        this.memories.set(memory.name, memory);
        imported++;
      }
    } else {
      const before = this.memories.size;
      this.parseMemoryMd(content);
      imported = this.memories.size - before;
    }

    this.emit('memories_imported', { count: imported });

    return imported;
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Create memory manager
 */
export function createMemoryManager(config: Partial<MemoryConfig> = {}): MemoryManager {
  return new MemoryManager(config);
}

/**
 * Quick memory save
 */
export async function saveMemory(
  name: string,
  content: string,
  type: MemoryType = 'user',
  description: string = ''
): Promise<void> {
  const manager = new MemoryManager();

  manager.addMemory({
    name,
    content,
    type,
    description: description || name,
  });

  await manager.saveMemories();
}
