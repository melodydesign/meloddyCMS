"""
Full recovery script - extract the latest good versions of ALL key files 
from the conversation transcript, before the corruption happened.
Target: state from ~4 hours ago (before step ~2700)
"""
import json
import os
import glob

TRANSCRIPT = r'C:\Users\9\.gemini\antigravity-ide\brain\b4be3967-cdb2-459c-bb1f-03a7d08af446\.system_generated\logs\transcript.jsonl'
OUTPUT_DIR = r'c:\Users\9\Desktop\meloddyCMS\scratch\recovered_files'
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Files we care about
TARGET_FILES = [
    'index.html',
    'dashboard.html', 
    'profile.html',
    'settings.html',
    'file-manager.html',
    'style.css',
    'theme.js',
    'theme-v2.js',
    'dashboard.js',
    'dashboard_v2.js',
    'utils.js',
    'login.html',
    'visual-editor.html',
    'docs.html',
    'landing.css',
    'sites.js',
    'db.js',
    'profile.js',
]

# Track latest good version of each file (before step ~2700)
file_versions = {}  # basename -> [(step_index, content, tool_name)]

print(f"Reading transcript from {TRANSCRIPT}...")
line_count = 0
with open(TRANSCRIPT, 'r', encoding='utf-8', errors='ignore') as f:
    for line in f:
        line_count += 1
        if 'write_to_file' not in line and 'multi_replace' not in line and 'replace_file_content' not in line:
            continue
        try:
            obj = json.loads(line)
        except:
            continue
        
        step = obj.get('step_index', 0)
        tool_calls = obj.get('tool_calls', [])
        
        for tc in tool_calls:
            name = tc.get('name', '')
            args = tc.get('arguments', {})
            
            if name == 'write_to_file':
                target = args.get('TargetFile', '')
                code = args.get('CodeContent', '')
                if not target or not code:
                    continue
                basename = os.path.basename(target.replace('\\\\', '\\').replace('/', '\\'))
                
                if basename in TARGET_FILES and len(code) > 100:
                    # Only keep versions before step 2700 (before corruption)
                    if step < 2700:
                        if basename not in file_versions:
                            file_versions[basename] = []
                        file_versions[basename].append((step, code, 'write_to_file'))
                        
            elif name == 'replace_file_content' or name == 'multi_replace_file_content':
                target = args.get('TargetFile', '')
                if not target:
                    continue
                basename = os.path.basename(target.replace('\\\\', '\\').replace('/', '\\'))
                if basename in TARGET_FILES:
                    # Track that this file was modified, but we can't reconstruct full content from patches
                    pass

print(f"Processed {line_count} transcript lines")
print(f"\nFiles found with write_to_file (before step 2700):")

for basename, versions in sorted(file_versions.items()):
    latest = versions[-1]
    step, content, tool = latest
    # Check if content is truncated
    truncated = '<truncated' in content or 'truncated' in content[-100:]
    content_len = len(content)
    
    print(f"  {basename}: step={step}, size={content_len}, truncated={truncated}, versions={len(versions)}")
    
    if not truncated and content_len > 200:
        # Save to recovered files
        outpath = os.path.join(OUTPUT_DIR, basename)
        with open(outpath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"    -> SAVED to {outpath}")
    else:
        print(f"    -> SKIPPED (truncated or too small)")

# Also check for versions AFTER 2700 that might be good (full rewrites)
print(f"\n\nFiles found with write_to_file (after step 2700, for reference):")
file_versions_late = {}
with open(TRANSCRIPT, 'r', encoding='utf-8', errors='ignore') as f:
    for line in f:
        if 'write_to_file' not in line:
            continue
        try:
            obj = json.loads(line)
        except:
            continue
        step = obj.get('step_index', 0)
        if step < 2700:
            continue
        for tc in obj.get('tool_calls', []):
            if tc.get('name') == 'write_to_file':
                args = tc.get('arguments', {})
                target = args.get('TargetFile', '')
                code = args.get('CodeContent', '')
                if not target or not code:
                    continue
                basename = os.path.basename(target.replace('\\\\', '\\').replace('/', '\\'))
                if basename in TARGET_FILES:
                    truncated = '<truncated' in code or 'truncated' in code[-100:] if code else True
                    print(f"  {basename}: step={step}, size={len(code)}, truncated={truncated}")

print("\n\nDone. Check scratch/recovered_files/ for recovered content.")
