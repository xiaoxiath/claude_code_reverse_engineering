#!/usr/bin/env python3
"""Compile the complete system prompt reconstruction document from all extracted data"""
import re, os

with open('cli_v2185.js', 'r', encoding='utf-8', errors='replace') as f:
    src = f.read()

def extract_template_literal(src, start_pos):
    """Extract content of a template literal starting after the opening backtick"""
    depth = 0
    for i in range(start_pos, min(start_pos + 30000, len(src))):
        c = src[i]
        if c == '$' and i+1 < len(src) and src[i+1] == '{':
            depth += 1
        elif c == '}' and depth > 0:
            depth -= 1
        elif c == '`' and depth == 0:
            return src[start_pos:i]
    return src[start_pos:start_pos+5000]

def extract_func_body(name):
    m = re.search(rf'function\s+{re.escape(name)}\s*\([^)]*\)\s*\{{', src)
    if not m: return None
    depth = 0; in_str = None; esc = False
    for i in range(m.start(), min(m.start()+20000, len(src))):
        c = src[i]
        if esc: esc = False; continue
        if c == '\\': esc = True; continue
        if in_str:
            if c == in_str: in_str = None
            continue
        if c in ('"', "'", '`'): in_str = c; continue
        if c == '{': depth += 1
        elif c == '}':
            depth -= 1
            if depth == 0: return src[m.start():i+1]
    return None

# Extract all needed pieces
pieces = {}

# 1. Main builder PD
pieces['PD'] = extract_func_body('PD')

# 2. Section builders
for name in ['Q4z', 'd4z', 'c4z', 'l4z', 'i4z', 'a4z', 'o4z', 'g4z', 'F4z', 'U4z', 's4z', 'e4z', 'WVq', 'ZVq']:
    pieces[name] = extract_func_body(name)

# 3. Tool prompts
for name in ['tXK', 'jl4', 'Hl4', 'VFz', 'TFz', 'JT1', 'Dl4', 'ljK', 'awK']:
    pieces[name] = extract_func_body(name)

# 4. Key variables
# hXq (security policy in identity)
pos = src.find('var hXq=')
if pos >= 0:
    q = src[pos+8]  # quote char
    end = src.find(q, pos+9)
    pieces['hXq'] = src[pos+9:end] if end > 0 else ''

# K3K (TodoWrite prompt)
pos = src.find('K3K=`')
if pos >= 0:
    pieces['K3K'] = extract_template_literal(src, pos+5)

# nG9 (Talking to user)
pos = src.find('nG9=`')
if pos >= 0:
    pieces['nG9'] = extract_template_literal(src, pos+5)

# aj1 (Brief description)
pos = src.find('aj1="')
if pos >= 0:
    end = src.find('"', pos+5)
    while end > 0 and src[end-1] == '\\':
        end = src.find('"', end+1)
    pieces['aj1'] = src[pos+5:end].replace('\\n', '\n').replace('\\"', '"') if end > 0 else ''

# $A6 (global cache boundary)
pos = src.find('$A6="')
if pos >= 0:
    end = src.find('"', pos+5)
    pieces['$A6'] = src[pos+5:end] if end > 0 else ''

# Kqz (summarize tool results)
pos = src.find('Kqz="')
if pos >= 0:
    end = src.find('"', pos+5)
    pieces['Kqz'] = src[pos+5:end] if end > 0 else ''

# vVq (agent base prompt)
pos = src.find('vVq="')
if pos >= 0:
    end = src.find('"', pos+5)
    while end > 0 and src[end-1] == '\\':
        end = src.find('"', end+1)
    pieces['vVq'] = src[pos+5:end].replace('\\n', '\n') if end > 0 else ''

# HT1 (Glob prompt)
pos = src.find('HT1=`')
if pos >= 0:
    pieces['HT1'] = extract_template_literal(src, pos+5)

# vYK (NotebookEdit prompt)
pos = src.find('vYK="')
if pos >= 0:
    end = pos + 5
    while end < len(src):
        end = src.find('"', end)
        if end == -1: break
        if src[end-1] != '\\': break
        end += 1
    pieces['vYK'] = src[pos+5:end].replace('\\n', '\n') if end > 0 else ''

# Jl4 (WebFetch description)
pos = src.find('Jl4=`')
if pos >= 0:
    pieces['Jl4'] = extract_template_literal(src, pos+5)

# Agent tool prompt (full dynamic builder)
pos = src.find('Launch a new agent to handle complex, multi-step')
if pos >= 0:
    # Find enclosing function or let/var assignment
    for i in range(pos, max(0, pos-8000), -1):
        chunk = src[i:i+20]
        if chunk.startswith('function ') or (chunk.startswith('let ') and '=' in chunk[:50]):
            body = extract_func_body(src[i+9:i+30].split('(')[0].strip()) if chunk.startswith('function ') else None
            if body and 'Launch a new agent' in body:
                pieces['AgentPrompt'] = body
                break

# zqz (general-purpose agent prompt)
pieces['zqz'] = extract_func_body('zqz')

# b2_ (Write tool additional note)
pieces['b2_'] = extract_func_body('b2_')

# B4z (hooks explanation)
pieces['B4z'] = extract_func_body('B4z')

# l8Y (Bash additional instructions)
pieces['l8Y'] = extract_func_body('l8Y')

# ax1 (model IDs)
pos = src.find('ax1={')
if pos >= 0:
    end = src.find('}', pos)
    pieces['ax1'] = src[pos:end+1] if end > 0 else ''

# m4z (model name constant)
pos = src.find('m4z="')
if pos >= 0:
    end = src.find('"', pos+5)
    pieces['m4z'] = src[pos+5:end] if end > 0 else ''

# n4z (fork agent description)
pieces['n4z'] = extract_func_body('n4z')

# Tengu/security prompts - search for the classifier
tengu_prompts = []
for pat in ['You are a classifier', 'BLOCK/ALLOW', 'security monitor']:
    pos = src.find(pat)
    while pos >= 0 and pos < len(src):
        # Get surrounding context
        before = src[max(0,pos-200):pos]
        if any(c in before[-10:] for c in ['`', '"', "'"]):
            tengu_prompts.append((pos, src[max(0,pos-200):pos+2000][:2200]))
        pos = src.find(pat, pos+1)

# Save all pieces for reference
with open('extracted_pieces.txt', 'w') as f:
    for name, content in sorted(pieces.items()):
        if content:
            f.write(f"\n{'='*60}\n{name} ({len(content)} chars)\n{'='*60}\n")
            f.write(content[:5000] + ('\n...[truncated]' if len(content) > 5000 else '') + '\n')

print(f"Extracted {len([v for v in pieces.values() if v])} pieces")
for name, content in sorted(pieces.items()):
    if content:
        print(f"  {name}: {len(content)} chars")
    else:
        print(f"  {name}: EMPTY/NONE")

if tengu_prompts:
    print(f"\nTengu prompts found: {len(tengu_prompts)}")
    for pos, ctx in tengu_prompts[:3]:
        print(f"  at {pos}: {ctx[:200]}...")
