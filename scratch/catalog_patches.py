import json, os
from collections import defaultdict

TRANSCRIPT = r'C:\Users\9\.gemini\antigravity-ide\brain\b4be3967-cdb2-459c-bb1f-03a7d08af446\.system_generated\logs\transcript.jsonl'

# Collect ALL replace_file_content and multi_replace_file_content operations
patches = []  # (step, tool_name, target_file, details)

with open(TRANSCRIPT, 'r', encoding='utf-8', errors='ignore') as f:
    for line in f:
        if 'replace_file_content' not in line:
            continue
        try:
            obj = json.loads(line)
        except:
            continue
        step = obj.get('step_index', 0)
        status = obj.get('status', '')
        
        for tc in obj.get('tool_calls', []):
            if not isinstance(tc, dict):
                continue
            name = tc.get('name', '')
            if name not in ('replace_file_content', 'multi_replace_file_content'):
                continue
            args = tc.get('args', {})
            if not isinstance(args, dict):
                continue
            target = args.get('TargetFile', '').strip('"').replace('\\\\', '\\')
            basename = target.replace('\\', '/').split('/')[-1]
            
            if name == 'replace_file_content':
                tc_content = args.get('TargetContent', '')
                rc_content = args.get('ReplacementContent', '')
                patches.append((step, name, basename, target, len(tc_content), len(rc_content), args.get('Description', '')))
            elif name == 'multi_replace_file_content':
                chunks = args.get('ReplacementChunks', [])
                n_chunks = len(chunks) if isinstance(chunks, list) else 0
                patches.append((step, name, basename, target, n_chunks, 0, args.get('Description', '')))

# Group by file
by_file = defaultdict(list)
for p in patches:
    by_file[p[2]].append(p)

print(f"Total replace operations: {len(patches)}")
print(f"Files patched: {len(by_file)}\n")

for basename in sorted(by_file.keys()):
    ops = by_file[basename]
    print(f"\n=== {basename} ({len(ops)} patches) ===")
    for step, name, bn, target, a, b, desc in ops:
        if name == 'replace_file_content':
            print(f"  step={step}: replace ({a} -> {b} chars) - {desc[:80]}")
        else:
            print(f"  step={step}: multi_replace ({a} chunks) - {desc[:80]}")
