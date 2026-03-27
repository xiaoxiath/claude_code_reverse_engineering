#!/usr/bin/env python3
"""Extract tool prompts using discovered function names"""
import re

with open('cli_v2185.js', 'r', encoding='utf-8', errors='replace') as f:
    src = f.read()

def extract_balanced(text, start, max_len=20000):
    depth = 0; in_str = None; esc = False
    for i in range(start, min(start + max_len, len(text))):
        c = text[i]
        if esc: esc = False; continue
        if c == '\\': esc = True; continue
        if in_str:
            if c == in_str: in_str = None
            continue
        if c in ('"', "'", '`'): in_str = c; continue
        if c == '{': depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0: return text[start:i+1]
    return text[start:start+3000]

def find_func(name):
    m = re.search(rf'function\s+{re.escape(name)}\s*\(', src)
    if m: return m.start(), extract_balanced(src, m.start())
    return None, None

# From the tool definitions scan:
# Edit: h3K, Write: Hl4, Grep: JT1, WebSearch: Dl4
# Bash: tXK (already have)
# Read: INLINE at 9678911, Glob: INLINE at 8842881 
# NotebookEdit: INLINE at 8849434, WebFetch: INLINE at 9113315
# TodoWrite: INLINE at 8641373
# Also interesting: WT (Plan tool): awK, uP (SendMessage): ljK

func_tools = {
    'Edit': 'h3K',
    'Write': 'Hl4', 
    'Grep': 'JT1',
    'WebSearch': 'Dl4',
    'Bash': 'tXK',
    'Plan/TodoWrite_legacy': 'awK',
    'SendMessage': 'ljK',
}

inline_tools = {
    'Read': 9678911,
    'Glob': 8842881,
    'NotebookEdit': 8849434,
    'WebFetch': 9113315,
    'TodoWrite': 8641373,
    'TaskStop': 9121538,
    'Task': None,  # mp - need to find
}

results = {}

# Extract function-based prompts
for tool_name, func_name in func_tools.items():
    pos, body = find_func(func_name)
    if body:
        results[tool_name] = body
        print(f"{tool_name}: {func_name}() at {pos}, {len(body)} chars")
    else:
        print(f"{tool_name}: {func_name}() NOT FOUND")

# Extract inline prompts
for tool_name, offset in inline_tools.items():
    if offset is None:
        continue
    # Get the tool object and extract prompt function
    obj = extract_balanced(src, offset)
    pm = re.search(r'(?:async\s+)?prompt\s*\([^)]*\)\s*\{', obj)
    if pm:
        prompt = extract_balanced(obj, pm.start())
        results[tool_name] = prompt
        print(f"{tool_name}: inline at {offset}, {len(prompt)} chars")
    else:
        # Try description field
        dm = re.search(r'description\s*\([^)]*\)\s*\{', obj)
        if dm:
            desc = extract_balanced(obj, dm.start())
            results[tool_name] = desc
            print(f"{tool_name}: description at {offset}, {len(desc)} chars")

# Agent tool - special case, prompt is dynamically built
# The function that builds it was found containing "Launch a new agent"
agent_func_pos = src.find('Launch a new agent to handle complex')
if agent_func_pos >= 0:
    # Find enclosing function
    search_back = src[max(0, agent_func_pos-10000):agent_func_pos]
    # Find last 'function' or arrow function
    last_func = search_back.rfind('function ')
    if last_func >= 0:
        abs_pos = max(0, agent_func_pos-10000) + last_func
        body = extract_balanced(src, abs_pos)
        if 'Launch a new agent' in body:
            results['Agent'] = body
            print(f"Agent: function at {abs_pos}, {len(body)} chars")

# Also get the SendUserMessage/Brief variables
print("\n=== Additional prompt variables ===")

# H06 tool (SendUserMessage) - at 6443530
h06_obj = extract_balanced(src, 6443530)
pm = re.search(r'(?:async\s+)?prompt\s*\([^)]*\)\s*\{', h06_obj)
if pm:
    prompt = extract_balanced(h06_obj, pm.start())
    results['SendUserMessage_prompt'] = prompt  
    print(f"SendUserMessage: inline, {len(prompt)} chars")

# Brief tool prompt (aj1)
aj1_pos = src.find('aj1="Send a message')
if aj1_pos >= 0:
    end = src.find('"', aj1_pos + 5)
    # Handle escaped quotes
    while end > 0 and src[end-1] == '\\':
        end = src.find('"', end + 1)
    results['Brief_description'] = src[aj1_pos+4:end]
    print(f"Brief (aj1): {len(results['Brief_description'])} chars")

# nG9 (talking to user section)
ng9_pos = src.find('nG9=`')
if ng9_pos >= 0:
    depth = 0
    for i in range(ng9_pos + 5, min(ng9_pos + 10000, len(src))):
        c = src[i]
        if c == '$' and i+1 < len(src) and src[i+1] == '{':
            depth += 1
        elif c == '}' and depth > 0:
            depth -= 1
        elif c == '`' and depth == 0:
            results['Talking_to_user'] = src[ng9_pos+5:i]
            print(f"nG9 (Talking to user): {i-ng9_pos-5} chars")
            break

# Save everything
with open('all_tool_prompts_v2185.txt', 'w') as out:
    out.write("=" * 80 + "\n")
    out.write("CLAUDE CODE v2.1.85 - ALL BUILT-IN TOOL PROMPTS\n")
    out.write("=" * 80 + "\n\n")
    
    order = ['Bash', 'Read', 'Write', 'Edit', 'Glob', 'Grep', 'Agent',
             'WebFetch', 'WebSearch', 'NotebookEdit', 'TodoWrite', 
             'TaskStop', 'SendUserMessage_prompt', 'Brief_description',
             'Talking_to_user', 'SendMessage', 'Plan/TodoWrite_legacy']
    
    for tool_name in order:
        if tool_name in results:
            out.write(f"\n{'='*60}\n")
            out.write(f"TOOL/SECTION: {tool_name}\n")
            out.write(f"{'='*60}\n")
            out.write(results[tool_name] + "\n")

    # Also add any not in order
    for tool_name in sorted(results.keys()):
        if tool_name not in order:
            out.write(f"\n{'='*60}\n")
            out.write(f"TOOL/SECTION: {tool_name}\n")
            out.write(f"{'='*60}\n")
            out.write(results[tool_name] + "\n")

print(f"\nTotal: {len(results)} items saved to all_tool_prompts_v2185.txt")
