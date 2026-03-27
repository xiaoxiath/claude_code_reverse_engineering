# System Prompt Extraction — v2.1.85

## Overview

This directory contains the **complete reverse-engineered system prompt** of the Code Agent
(third-party reimplementation), extracted from the `@anthropic-ai/claude-code@2.1.85` npm
package (`cli.js`, 12.9 MB readable JavaScript).

## Why v2.1.85 Instead of the Bun Binary?

The original Bun binary (v2.1.83, 190MB) embeds 28.1% of functions (1,749/6,225) as
**compiled bytecode** invisible to text-based analysis. The system prompt builder (`OD` in
the Bun binary) was one of these "ghost functions".

**Solution**: `npm pack @anthropic-ai/claude-code` downloads the Node.js distribution with
fully readable JS, bypassing the bytecode barrier entirely.

Cross-version function name mapping:
| Bun v2.1.83 | Node v2.1.31 | Node v2.1.85 | Purpose |
|-------------|-------------|-------------|---------|
| OD | BV | PD | System Prompt Builder |
| V5 | — | QF | Static section cache |
| jH | — | WXq | Dynamic section cache |

## File Index

| File | Description |
|------|-------------|
| `COMPLETE_SYSTEM_PROMPT_RECONSTRUCTION.md` | Complete reconstructed system prompt document |
| `extracted_pieces.txt` | All 40+ extracted raw pieces (variables + functions) |
| `od_function_trace.txt` | Cross-version analysis of the prompt builder function |
| `sections/all_prompt_sections_v2185.txt` | All 28 section builder function bodies |
| `tools/all_tool_prompts_v2185.txt` | All built-in tool prompt functions |
| `extraction_scripts/` | Python scripts used for extraction |

## Prompt Assembly Architecture

```
PD(tools, model, dirs, mcpClients)
  ├─ Static sections (7):
  │   Q4z  → Identity/Role
  │   d4z  → System/Tool instructions
  │   c4z  → Coding task instructions
  │   l4z  → Careful action guidelines
  │   i4z  → Tool usage rules
  │   a4z  → Tone and style
  │   o4z  → Output efficiency
  │
  ├─ Cache boundary: $A6 = "__SYSTEM_PROMPT_DYNAMIC_BOUNDARY__"
  │
  └─ Dynamic sections (10, cached via QF/WXq):
      ZV8  → Memory (~/.claude/memory.md)
      p4z  → Model override (null)
      WVq  → Environment info (CWD, OS, date, model, etc.)
      g4z  → Language instruction
      F4z  → Output style
      U4z  → MCP server instructions
      e4z  → Scratchpad directory
      qqz  → FRC (null)
      Kqz  → Summarize tool results
      _qz  → Brief mode
```

## Built-in Tools (14+)

| Tool | Minified | Prompt Function | Size |
|------|---------|----------------|------|
| Bash | X4 | tXK() | 4105 chars |
| Read | C4 | jl4() | ~500 chars |
| Write | _5 | Hl4() | 501 chars |
| Edit | vq | VFz→h3K | 995 chars |
| Glob | a_ | HT1 | 371 chars |
| Grep | G_ | JT1() | 912 chars |
| WebSearch | DN | Dl4() | 1340 chars |
| WebFetch | SO | Jl4 template | ~500 chars |
| Agent | jq | dynamic builder | ~1500 chars |
| TodoWrite | XC | K3K | 9115 chars |
| SendUserMessage | H06 | aj1+nG9 | 1679 chars |
| NotebookEdit | uf | — | — |
| Task | mp | — | — |
| TaskStop | lI | — | — |


## Tengu Security Classifier (Auto-Mode)

When `auto` permission mode is enabled, every tool call is evaluated by a secondary
classifier model before execution. This is the **Tengu** system.

| File | Description |
|------|-------------|
| `tengu_classifier_prompt.txt` | Main classifier system prompt (12,533 chars) |
| `tengu_environment_template.txt` | Environment + BLOCK/ALLOW rules template (13,284 chars) |
| `tengu_suffix_instructions.txt` | Suffix instructions, model config, tool schema |

### Architecture

```
Tool call from main agent
  │
  ├─ Ny8() — Main classifier function
  │   ├─ Builds transcript from conversation history
  │   ├─ Extracts tool input via jRq()
  │   └─ Calls classifier model via API
  │
  ├─ Azz() — System prompt builder
  │   ├─ oLq module → Main prompt (zRq)
  │   ├─ aLq module → Environment template (WB1)
  │   └─ Injects user allow/deny rules from config
  │
  └─ classify_result tool (Yzz)
      ├─ thinking: string
      ├─ shouldBlock: boolean
      └─ reason: string
```

### Feature Flags
- `tengu_auto_mode_config` — Model selection and two-stage classifier config
- `tengu_system_prompt_global_cache` — Cache boundary for static/dynamic prompt split
