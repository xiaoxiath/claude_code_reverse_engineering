#!/usr/bin/env python3
"""Extract the PD function (system prompt builder) and all its section builders from cli.js v2.1.85"""
import re

with open('cli_v2185.js', 'r', encoding='utf-8', errors='replace') as f:
    src = f.read()

# PD function starts at ~6459745 (the async function before "You are Claude Code")
# Let's find the exact start
pd_area = src[6459600:6462000]
print("=== PD function area ===")

# Find function start
m = re.search(r'(?:async\s+)?function\s+PD\s*\(', pd_area)
if m:
    print(f"PD function found at relative offset {m.start()}, absolute {6459600+m.start()}")
    # Now extract with balanced braces
    abs_start = 6459600 + m.start()
    
    # Balance braces to find end
    depth = 0
    in_str = None
    escape_next = False
    func_start = abs_start
    func_end = None
    for i in range(abs_start, min(abs_start + 10000, len(src))):
        c = src[i]
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
                func_end = i + 1
                break
    
    if func_end:
        pd_func = src[func_start:func_end]
        print(f"PD function length: {len(pd_func)} chars")
        print("\n--- PD FUNCTION FULL TEXT ---")
        print(pd_func)
        print("--- END ---")
        
        with open('pd_function_full.txt', 'w') as f2:
            f2.write(pd_func)
    else:
        print("Could not find end of PD function")
        print(pd_area[:1500])
else:
    print("PD function not found by pattern, showing area:")
    print(pd_area[:2000])

# Now extract the region around PD for all section builders
# The section builder functions should be defined near PD
print("\n\n=== Section builders region (6458000 - 6470000) ===")
region = src[6458000:6470000]
# Find all function definitions
for m in re.finditer(r'(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)', region):
    abs_pos = 6458000 + m.start()
    name = m.group(1)
    params = m.group(2)
    # Get body preview
    body = region[m.end():m.end()+500]
    # Check if it contains prompt-like content
    is_prompt = any(kw in body for kw in ['return', '`', 'You', 'tool', 'prompt', 'section', 'instruction', '##', 'must', 'should'])
    if is_prompt:
        print(f"\n  {name}({params}) at {abs_pos}")
        print(f"    Body preview: {body[:300]}")
