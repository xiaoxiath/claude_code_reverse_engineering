#!/usr/bin/env python3
"""Final comprehensive tool prompt extraction - trace all variable references"""
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

# For inline tools that returned 26 chars, the prompt function just returns a variable.
# Let's look at what's actually in those tool objects

# Read tool at 9678911
print("=== Read tool object ===")
read_obj = extract_balanced(src, 9678911)
print(read_obj[:2000])
print("\n" + "="*60)

# Glob tool at 8842881
print("\n=== Glob tool object ===")  
glob_obj = extract_balanced(src, 8842881)
print(glob_obj[:2000])
print("\n" + "="*60)

# NotebookEdit at 8849434
print("\n=== NotebookEdit tool object ===")
nb_obj = extract_balanced(src, 8849434)
print(nb_obj[:2000])
print("\n" + "="*60)

# WebFetch at 9113315
print("\n=== WebFetch tool object ===")
wf_obj = extract_balanced(src, 9113315)
print(wf_obj[:2000])
print("\n" + "="*60)

# TodoWrite at 8641373
print("\n=== TodoWrite tool object ===")
todo_obj = extract_balanced(src, 8641373)
print(todo_obj[:3000])
print("\n" + "="*60)

# Edit tool - h3K returned only 28 chars, let's see it
print("\n=== Edit h3K function ===")
pos, body = find_func('h3K')
if body:
    print(f"h3K at {pos}: {body}")
    # If it returns a variable, find that variable
    m = re.search(r'return\s+(\w+)', body)
    if m:
        var = m.group(1)
        print(f"\nReturns variable: {var}")
        # Find that variable
        vpos = src.rfind(f'{var}=', max(0, pos-50000), pos)
        if vpos >= 0:
            print(f"{var} defined at {vpos}: {src[vpos:vpos+500]}")
