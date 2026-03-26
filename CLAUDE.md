# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a reverse engineering project for Claude Code (Bun 2.1.83). The project successfully extracted 92% of core functionality from a 190MB binary file through 6 rounds of static analysis, producing 27 detailed reports and a restored TypeScript implementation.

**Project Status**: ✅ 92% Complete
**Verification Rate**: 95%
**Source**: Bun 2.1.83 Binary (190MB)

## Repository Structure

```
claude_code_reverse_engineering/
├── source_code/           # Extracted JavaScript bundle (6.9MB, 60,674 lines)
│   └── bun_extracted_full.js
├── restored/              # Restored TypeScript implementation
│   ├── src/
│   │   ├── agent/        # Agent core class
│   │   ├── tools/        # Tool implementations
│   │   ├── llm/          # LLM client
│   │   ├── permissions/  # Permission manager
│   │   └── session/      # Session manager
│   └── package.json
├── reports/               # 27 analysis reports
└── documentation/         # Architecture docs and implementation guides
```

## Working with the Restored Code

The `restored/` directory contains a TypeScript implementation rebuilt from the extracted code.

### Commands

```bash
# Install dependencies
bun install

# Run the restored implementation
bun start "your question here"

# Development mode with hot reload
bun dev

# Build to executable
bun run build

# Type checking
bun run typecheck

# Run tests (when available)
bun test
```

### Environment Variables

```bash
ANTHROPIC_API_KEY=your_api_key      # Required for LLM API
PERMISSION_MODE=interactive          # Options: allow | deny | interactive | sandbox
DEBUG=true                           # Enable debug logging
```

### Development Workflow

1. **Modified code goes in `restored/src/`**
2. **Reference extracted code in `source_code/bun_extracted_full.js` for verification**
3. **Consult reports in `reports/` for architectural context**

## Key Architecture Concepts

### 5-Layer Architecture

1. **User Interface Layer** - CLI / IDE / Web
2. **Agent Core Layer** - Agent / Session / Permission
3. **Functional Layer** - LLM / Tools / Config / Memory
4. **Communication Layer** - WebSocket / Unix Socket / HTTP
5. **Runtime Layer** - Bun / File System / Database

### Core Components

- **Agent (Sp9)** - Event-driven core class at `source_code/bun_extracted_full.js:48540-48740`
- **ToolRegistry** - Plugin-based tool system
- **PermissionManager** - Multi-mode permission control
- **SessionManager** - Session state management with JSONL persistence
- **LLMClient** - Anthropic API client with streaming support

### Event System

The Agent uses an event-driven architecture with 8 event types:
- `tombstone`, `assistant`, `user`, `stream_event`
- `attachment`, `system`, `tool_use_summary`, `progress`

Streaming uses 6 Server-Sent Event types:
- `message_start`, `content_block_start`, `content_block_delta`
- `content_block_stop`, `message_delta`, `message_stop`

### Configuration Priority (6 Levels)

1. Policy settings (highest)
2. Remote management config
3. Enterprise config
4. Global config (`~/.claude/config.json`)
5. Project config (`.claude/config.json`)
6. Default config (lowest)

### Permission Rules Format

```
ToolName(ruleContent)
```

Examples:
- `Bash` - Allow all Bash commands
- `Bash(rm *)` - Allow all rm commands
- `Read(/tmp/*)` - Allow reading files in /tmp

### MCP Protocol

Tool naming: `mcp__${serverName}__${toolName}`

Communication via:
- Socket client with auto-reconnect (`T58` at line 46238-46338)
- Stdio transport for process communication

## Key Code Locations

The extracted JavaScript in `source_code/bun_extracted_full.js` contains:

| Feature | Line Range | Notes |
|---------|-----------|-------|
| Agent class (Sp9) | 48540-48740 | Core Agent implementation |
| Socket client (T58) | 46238-46338 | Auto-reconnect logic |
| MCP naming system | 46315 | Tool name formatting |
| Permission parsing | 46315 | Escape handling |
| Message persistence | 46238 | JSONL storage |
| Tool Registry | 46315 | Name mapping |

Variable names are obfuscated:
- `Sp9` → Agent class
- `cS` → Main loop generator (not extracted)
- `vFT` → Message processor (not extracted)
- `ymT` → Event generator (not extracted)
- `T58` → Socket client

## Incomplete Functions (8%)

Three core functions could not be extracted through static analysis due to deep obfuscation:

1. **cS (Main Loop Generator)** - Priority: HIGH, Time: 1-2 days
   - Calls Claude API
   - Streaming response processing
   - Event generation

2. **vFT (Message Processor)** - Priority: MEDIUM, Time: 2-4 hours
   - Context compression algorithm
   - Tool filtering
   - Model selection

3. **ymT (Event Generator)** - Priority: LOW, Time: 30 minutes
   - Message-to-event conversion
   - Stream forwarding

**Implementation guides**: See `documentation/CORE_FUNCTIONS_IMPLEMENTATION_GUIDE.md`

## Important Reports

### Must Read
- `reports/FINAL_REVERSE_ENGINEERING_ANALYSIS.md` - Final analysis
- `reports/PROJECT_FINAL_SUMMARY.md` - Project completion summary
- `documentation/CORE_FUNCTIONS_IMPLEMENTATION_GUIDE.md` - Implementation guide

### Architecture & Design
- `documentation/ARCHITECTURE_OVERVIEW.md` - Complete architecture
- `reports/FINAL_COMPREHENSIVE_REPORT.md` - Full architecture overview
- `reports/CODE_AGENT_ARCHITECTURE_DESIGN.md` - Agent design

### Core Extraction Reports
- `reports/AGENT_EXTRACTION_REPORT.md` - Agent core implementation
- `reports/CORE_FUNCTIONALITY_EXTRACTION_REPORT.md` - Core features
- `reports/CORE_FUNCTIONS_ANALYSIS_REPORT_5.md` - Deep function analysis

## Hook System

12 Hook event types for extensibility:
- `PreToolUse`, `PostToolUse`, `Notification`
- `UserPromptSubmit`, `SessionStart`, `SessionEnd`
- `Stop`, `SubagentStop`, `PreCompact`, `PostCompact`
- `TeammateIdle`, `TaskCompleted`

## Message Persistence

Format: JSONL (JSON Lines)
Location: `.claude/sessions/{session-id}.jsonl`

Each line is a JSON object with:
```json
{"type":"user","message":{...},"uuid":"...","timestamp":...}
```

## Technical Stack

- **Runtime**: Bun (Zig + JavaScriptCore)
- **Language**: TypeScript
- **LLM SDK**: @anthropic-ai/sdk
- **Validation**: Zod
- **Search**: Ripgrep (embedded)
- **Diff**: Myers algorithm

## Verification Approach

When implementing features in `restored/`:

1. **Check extracted code** - Search `source_code/bun_extracted_full.js` for reference
2. **Consult reports** - Read relevant analysis in `reports/`
3. **Verify architecture** - Cross-reference with `documentation/ARCHITECTURE_OVERVIEW.md`
4. **Line number references** - All extracted code includes precise line numbers for verification

Example verification:
```bash
# Extract Agent class from source
sed -n '48540,48740p' source_code/bun_extracted_full.js

# Search for specific functionality
grep -n "submitMessage" source_code/bun_extracted_full.js
```

## ContentBlock System

8 block types supported:
- `TextBlock`, `ThinkingBlock`, `ToolUseBlock`, `ToolResultBlock`
- `ImageBlock`, `DocumentBlock`, `CodeExecutionBlock`, `WebSearchResultBlock`

Uses TryPick pattern for streaming delta handling.

## Performance Features

- Auto-reconnect with exponential backoff (max 10 attempts, 1s base delay)
- Budget control with real-time checking
- Maximum turn limits to prevent infinite loops
- Context compression at compact boundaries

## Project Goals

This is an educational/research project to understand Claude Code's architecture through reverse engineering. The restored code is for learning purposes only.

**Completion**: 92% extracted, remaining 8% can be reimplemented using the implementation guide.

**Generated**: 2026-03-25
**Author**: Claude (Sonnet 4.6)
