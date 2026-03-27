#!/usr/bin/env python3
"""Extract ALL system prompt section builders from cli.js v2.1.85 - complete extraction"""
import re

with open('cli_v2185.js', 'r', encoding='utf-8', errors='replace') as f:
    src = f.read()

def extract_function(name, start_offset, src_text, max_len=15000):
    """Extract complete function body using brace balancing"""
    # Find function start
    region = src_text[start_offset:start_offset+max_len]
    m = re.search(rf'(?:async\s+)?function\s+{re.escape(name)}\s*\([^)]*\)\s*\{{', region)
    if not m:
        return None
    
    abs_start = start_offset + m.start()
    # Find the opening brace
    brace_pos = start_offset + m.end() - 1  # position of opening {
    
    depth = 0
    in_str = None
    escape_next = False
    
    for i in range(brace_pos, min(brace_pos + max_len, len(src_text))):
        c = src_text[i]
        if escape_next:
            escape_next = False
            continue
        if c == '\\':
            escape_next = True
            continue
        if in_str:
            if c == in_str:
                in_str = None
            continue
        if c in ('"', "'", '`'):
            in_str = c
            continue
        if c == '{':
            depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0:
                return src_text[abs_start:i+1]
    return None

def find_function_offset(name, src_text):
    """Find offset of function definition"""
    m = re.search(rf'(?:async\s+)?function\s+{re.escape(name)}\s*\(', src_text)
    if m:
        return m.start()
    return None

# PD function return array has these static section builders:
# Q4z(A) - identity/role
# d4z(j) - tool instructions  
# c4z() - coding instructions
# l4z() - system context/reminders
# i4z(j,$) - agent/skill tool instructions
# a4z() - tone/style
# o4z() - output efficiency

# And dynamic sections via QF/WXq:
# ZV8() - memory
# p4z() - ant model override
# WVq(K,_) - environment info
# g4z(lang) - language
# F4z(A) - output style
# U4z(z) - MCP instructions (which calls s4z internally)
# e4z() - scratchpad
# qqz(K) - frc
# Kqz - summarize_tool_results (variable, not function)
# _qz() - brief

# Also: $A6 = global cache boundary marker

target_functions = [
    'Q4z', 'd4z', 'c4z', 'l4z', 'i4z', 'a4z', 'o4z',  # static sections
    'ZV8', 'p4z', 'WVq', 'g4z', 'F4z', 'U4z', 'e4z', 'qqz', '_qz',  # dynamic sections
    's4z', 't4z', 'rn6', 'zqz',  # helpers
    'PD',  # main builder
    'ZVq', 'fVq', 'GVq',  # env helpers
]

# Search region around the prompt builder area
search_start = 6455000
search_end = 6475000

results = {}
for name in target_functions:
    offset = None
    # Search in the prompt area first
    region = src[search_start:search_end]
    m = re.search(rf'(?:async\s+)?function\s+{re.escape(name)}\s*\(', region)
    if m:
        offset = search_start + m.start()
    else:
        # Search whole file
        m = re.search(rf'(?:async\s+)?function\s+{re.escape(name)}\s*\(', src)
        if m:
            offset = m.start()
    
    if offset:
        body = extract_function(name, offset, src)
        if body:
            results[name] = {'offset': offset, 'body': body}
            print(f"  {name}: {len(body)} chars at offset {offset}")
        else:
            # Get raw text
            raw = src[offset:offset+2000]
            results[name] = {'offset': offset, 'body': raw}
            print(f"  {name}: ~2000 chars (couldn't balance braces) at offset {offset}")
    else:
        print(f"  {name}: NOT FOUND")

# Also find variable definitions
print("\n=== Variable definitions ===")
for varname in ['Kqz', '$A6', 'DVq', 'vVq', 'ax1']:
    # Search for var/let/const assignment
    for pat in [f'var {varname}=', f'{varname}=`', f'{varname}="', f",{varname}="]:
        pos = src.find(pat, search_start)
        if pos == -1:
            pos = src.find(pat)
        if pos >= 0 and pos < len(src):
            val = src[pos:pos+3000]
            results[varname] = {'offset': pos, 'body': val[:3000]}
            print(f"  {varname}: found at offset {pos}")
            break
    else:
        print(f"  {varname}: NOT FOUND")

# Save everything
with open('all_prompt_sections_v2185.txt', 'w') as f2:
    f2.write("=" * 80 + "\n")
    f2.write("CLAUDE CODE v2.1.85 - COMPLETE SYSTEM PROMPT EXTRACTION\n")
    f2.write("=" * 80 + "\n\n")
    
    # First write PD with annotations
    if 'PD' in results:
        f2.write("\n" + "=" * 80 + "\n")
        f2.write("MAIN BUILDER: PD (=OD in Bun, =BV in v2.1.31)\n")
        f2.write("=" * 80 + "\n")
        f2.write(results['PD']['body'] + "\n")
    
    # Then each section in order
    section_order = [
        ('Q4z', 'Section 1: Identity/Role'),
        ('d4z', 'Section 2: Tool Instructions'),
        ('c4z', 'Section 3: Coding Instructions'),
        ('l4z', 'Section 4: System Context/Reminders'),
        ('i4z', 'Section 5: Agent/Skill Tool Instructions'),
        ('a4z', 'Section 6: Tone/Style'),
        ('o4z', 'Section 7: Output Efficiency'),
        ('ZV8', 'Dynamic: Memory'),
        ('p4z', 'Dynamic: Ant Model Override'),
        ('WVq', 'Dynamic: Environment Info (new)'),
        ('t4z', 'Dynamic: Environment Info (old)'),
        ('g4z', 'Dynamic: Language'),
        ('F4z', 'Dynamic: Output Style'),
        ('s4z', 'Dynamic: MCP Instructions'),
        ('U4z', 'Dynamic: MCP Instructions Wrapper'),
        ('e4z', 'Dynamic: Scratchpad'),
        ('qqz', 'Dynamic: FRC'),
        ('Kqz', 'Dynamic: Summarize Tool Results'),
        ('_qz', 'Dynamic: Brief'),
        ('$A6', 'Marker: Global Cache Boundary'),
        ('DVq', 'Variable: Brief Prompt Text'),
        ('vVq', 'Variable: Agent Base Prompt'),
        ('ax1', 'Variable: Related'),
        ('ZVq', 'Helper: Knowledge Cutoff'),
        ('fVq', 'Helper: Shell Info'),
        ('GVq', 'Helper: OS Version'),
        ('rn6', 'Helper: Agent Thread Notes'),
        ('zqz', 'Helper: Agent Prompt Builder'),
    ]
    
    for name, label in section_order:
        if name in results:
            f2.write("\n" + "=" * 80 + "\n")
            f2.write(f"{label}: {name}()\n")
            f2.write(f"Offset: {results[name]['offset']}\n")
            f2.write("=" * 80 + "\n")
            f2.write(results[name]['body'] + "\n")

print(f"\nTotal: {len(results)} sections extracted")
print("Saved to all_prompt_sections_v2185.txt")
