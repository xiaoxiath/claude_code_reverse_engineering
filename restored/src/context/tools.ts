/**
 * Context Management Tools
 *
 * Tools for managing and manipulating context
 */

import { Tool } from '../tools/registry';
import { ContextManager } from './manager';

// ============================================
// AddContextTool
// ============================================

export class AddContextTool implements Tool {
  name = 'add_context';
  description = 'Add custom context to the conversation';
  input_schema = {
    type: 'object',
    properties: {
      content: {
        type: 'string',
        description: 'Context content to add',
      },
      source: {
        type: 'string',
        enum: ['system', 'project', 'memory', 'session', 'tool'],
        description: 'Source of the context',
      },
      priority: {
        type: 'string',
        enum: ['critical', 'high', 'medium', 'low'],
        description: 'Priority of the context',
      },
      expires_in: {
        type: 'number',
        description: 'Expiration time in seconds (optional)',
      },
      metadata: {
        type: 'object',
        description: 'Additional metadata',
      },
    },
    required: ['content'],
  };

  private contextManager: ContextManager;

  constructor(contextManager: ContextManager) {
    this.contextManager = contextManager;
  }

  async execute(params: any): Promise<any> {
    const { content, source = 'tool', priority = 'medium', expires_in, metadata } = params;

    const block = {
      source: source as any,
      priority: priority as any,
      content,
      metadata,
      expires: expires_in ? Date.now() + expires_in * 1000 : undefined,
    };

    const id = this.contextManager.addContextBlock(block);

    return {
      success: true,
      block_id: id,
      message: `Context block added with ID: ${id}`,
    };
  }
}

// ============================================
// RemoveContextTool
// ============================================

export class RemoveContextTool implements Tool {
  name = 'remove_context';
  description = 'Remove a context block by ID';
  input_schema = {
    type: 'object',
    properties: {
      block_id: {
        type: 'string',
        description: 'ID of the context block to remove',
      },
    },
    required: ['block_id'],
  };

  private contextManager: ContextManager;

  constructor(contextManager: ContextManager) {
    this.contextManager = contextManager;
  }

  async execute(params: any): Promise<any> {
    const { block_id } = params;

    const removed = this.contextManager.removeContextBlock(block_id);

    return {
      success: removed,
      message: removed
        ? `Context block ${block_id} removed`
        : `Context block ${block_id} not found`,
    };
  }
}

// ============================================
// ListContextTool
// ============================================

export class ListContextTool implements Tool {
  name = 'list_context';
  description = 'List all context blocks';
  input_schema = {
    type: 'object',
    properties: {
      source: {
        type: 'string',
        enum: ['system', 'project', 'memory', 'session', 'tool'],
        description: 'Filter by source (optional)',
      },
      priority: {
        type: 'string',
        enum: ['critical', 'high', 'medium', 'low'],
        description: 'Filter by priority (optional)',
      },
    },
  };

  private contextManager: ContextManager;

  constructor(contextManager: ContextManager) {
    this.contextManager = contextManager;
  }

  async execute(params: any): Promise<any> {
    let blocks = this.contextManager.getAllContextBlocks();

    // Filter by source
    if (params.source) {
      blocks = blocks.filter(b => b.source === params.source);
    }

    // Filter by priority
    if (params.priority) {
      blocks = blocks.filter(b => b.priority === params.priority);
    }

    return {
      total: blocks.length,
      blocks: blocks.map(b => ({
        id: b.id,
        source: b.source,
        priority: b.priority,
        tokens: b.tokens,
        timestamp: b.timestamp,
        preview: b.content.slice(0, 100) + '...',
      })),
    };
  }
}

// ============================================
// GetContextStatsTool
// ============================================

export class GetContextStatsTool implements Tool {
  name = 'get_context_stats';
  description = 'Get context window statistics';
  input_schema = {
    type: 'object',
    properties: {},
  };

  private contextManager: ContextManager;

  constructor(contextManager: ContextManager) {
    this.contextManager = contextManager;
  }

  async execute(params: any): Promise<any> {
    const window = this.contextManager.getContextWindow();
    const stats = this.contextManager.getStats();

    return {
      window: {
        max_tokens: window.maxTokens,
        reserved_tokens: window.reservedTokens,
        available_tokens: window.availableTokens,
        used_tokens: window.usedTokens,
        utilization: `${((window.usedTokens / window.availableTokens) * 100).toFixed(1)}%`,
      },
      blocks: stats,
    };
  }
}

// ============================================
// CompressContextTool
// ============================================

export class CompressContextTool implements Tool {
  name = 'compress_context';
  description = 'Manually trigger context compression';
  input_schema = {
    type: 'object',
    properties: {
      strategy: {
        type: 'string',
        enum: ['sliding_window', 'hierarchical', 'semantic_clustering', 'token_budget', 'adaptive'],
        description: 'Compression strategy to use',
      },
    },
  };

  private contextManager: ContextManager;

  constructor(contextManager: ContextManager) {
    this.contextManager = contextManager;
  }

  async execute(params: any): Promise<any> {
    const result = this.contextManager.compressContext();

    return {
      success: true,
      compression: {
        original_tokens: result.originalTokens,
        compressed_tokens: result.compressedTokens,
        compression_ratio: `${(result.compressionRatio * 100).toFixed(1)}%`,
        removed_blocks: result.removedBlocks.length,
        merged_blocks: result.mergedBlocks.length,
      },
    };
  }
}

// ============================================
// ExportContextTool
// ============================================

export class ExportContextTool implements Tool {
  name = 'export_context';
  description = 'Export current context to a file';
  input_schema = {
    type: 'object',
    properties: {
      file_path: {
        type: 'string',
        description: 'Path to save the exported context',
      },
    },
    required: ['file_path'],
  };

  private contextManager: ContextManager;

  constructor(contextManager: ContextManager) {
    this.contextManager = contextManager;
  }

  async execute(params: any): Promise<any> {
    const { file_path } = params;

    const data = this.contextManager.exportContext();
    await Bun.write(file_path, data);

    return {
      success: true,
      message: `Context exported to ${file_path}`,
      size: data.length,
    };
  }
}

// ============================================
// ImportContextTool
// ============================================

export class ImportContextTool implements Tool {
  name = 'import_context';
  description = 'Import context from a file';
  input_schema = {
    type: 'object',
    properties: {
      file_path: {
        type: 'string',
        description: 'Path to load the context from',
      },
    },
    required: ['file_path'],
  };

  private contextManager: ContextManager;

  constructor(contextManager: ContextManager) {
    this.contextManager = contextManager;
  }

  async execute(params: any): Promise<any> {
    const { file_path } = params;

    const file = Bun.file(file_path);
    const data = await file.text();
    const imported = this.contextManager.importContext(data);

    return {
      success: true,
      message: `Imported ${imported} context blocks from ${file_path}`,
      imported,
    };
  }
}

// ============================================
// ClearContextTool
// ============================================

export class ClearContextTool implements Tool {
  name = 'clear_context';
  description = 'Clear all context blocks';
  input_schema = {
    type: 'object',
    properties: {
      confirm: {
        type: 'boolean',
        description: 'Confirm clearing all context',
      },
    },
    required: ['confirm'],
  };

  private contextManager: ContextManager;

  constructor(contextManager: ContextManager) {
    this.contextManager = contextManager;
  }

  async execute(params: any): Promise<any> {
    const { confirm } = params;

    if (!confirm) {
      return {
        success: false,
        message: 'Context clearing not confirmed',
      };
    }

    this.contextManager.clearContext();

    return {
      success: true,
      message: 'All context blocks cleared',
    };
  }
}

// ============================================
// PrioritizeContextTool
// ============================================

export class PrioritizeContextTool implements Tool {
  name = 'prioritize_context';
  description = 'Change priority of a context block';
  input_schema = {
    type: 'object',
    properties: {
      block_id: {
        type: 'string',
        description: 'ID of the context block',
      },
      priority: {
        type: 'string',
        enum: ['critical', 'high', 'medium', 'low'],
        description: 'New priority level',
      },
    },
    required: ['block_id', 'priority'],
  };

  private contextManager: ContextManager;

  constructor(contextManager: ContextManager) {
    this.contextManager = contextManager;
  }

  async execute(params: any): Promise<any> {
    const { block_id, priority } = params;

    const updated = this.contextManager.updateContextBlock(block_id, {
      priority: priority as any,
    });

    return {
      success: updated,
      message: updated
        ? `Context block ${block_id} priority updated to ${priority}`
        : `Context block ${block_id} not found`,
    };
  }
}

// ============================================
// Tool Registration Helper
// ============================================

export function registerContextTools(contextManager: ContextManager): Tool[] {
  return [
    new AddContextTool(contextManager),
    new RemoveContextTool(contextManager),
    new ListContextTool(contextManager),
    new GetContextStatsTool(contextManager),
    new CompressContextTool(contextManager),
    new ExportContextTool(contextManager),
    new ImportContextTool(contextManager),
    new ClearContextTool(contextManager),
    new PrioritizeContextTool(contextManager),
  ];
}
