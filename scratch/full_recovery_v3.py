import json, os
from collections import defaultdict

TRANSCRIPT = r'C:\Users\9\.gemini\antigravity-ide\brain\b4be3967-cdb2-459c-bb1f-03a7d08af446\.system_generated\logs\transcript.jsonl'
OUTPUT_DIR = r'c:\Users\9\Desktop\meloddyCMS\scratch\recovered_files'
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Collect ALL write_to_file
by_file = defaultdict(list)  # basename -> [(step, target_path, content)]

with open(TRANSCRIPT, 'r', encoding='utf-8', errors='ignore') as f:
    for line in f:
        if 'write_to_file' not in line:
            continue
        try:
            obj = json.loads(line)
        except:
            continue
        step = obj.get('step_index', 0)
        for tc in obj.get('tool_calls', []):
            if not isinstance(tc, dict):
                continue
            if tc.get('name') != 'write_to_file':
                continue
            args = tc.get('args', tc.get('arguments', {}))
            if not isinstance(args, dict):
                continue
            target = args.get('TargetFile', '')
            code = args.get('CodeContent', '')
            if not target or not code:
                continue
            # Clean target - remove extra quotes
            target = target.strip('"').replace('\\\\', '\\')
            bn = target.replace('\\', '/').split('/')[-1]
            by_file[bn].append((step, target, code))

print("=== ALL write_to_file calls by file ===\n")

# Show summary first
for bn in sorted(by_file.keys()):
    versions = by_file[bn]
    print(f"{bn}: {len(versions)} versions")
    for step, target, code in versions:
        trunc = '<truncated' in code or ('truncated' in code[-200:] if len(code) > 200 else False)
        marker = "TRUNC" if trunc else "OK"
        print(f"  step={step}, size={len(code)}, {marker}")

# Now save the best versions
# We want the latest version of each source file before step ~2700 
# (before everything broke)
print("\n\n=== RECOVERING FILES ===\n")

SOURCE_FILES = [
    'index.html', 'dashboard.html', 'profile.html', 'settings.html',
    'file-manager.html', 'style.css', 'theme.js', 'theme-v2.js',
    'dashboard.js', 'dashboard_v2.js', 'utils.js', 'login.html',
    'visual-editor.html', 'docs.html', 'landing.css', 'sites.js',
    'db.js', 'profile.js', 'toast.js', 'register.html',
]

for bn in SOURCE_FILES:
    if bn not in by_file:
        continue
    versions = by_file[bn]
    # Find latest non-truncated version before step 2700
    good = []
    for step, target, code in versions:
        if step < 2700 and len(code) > 200:
            trunc = '<truncated' in code
            if not trunc:
                good.append((step, code))
    
    if good:
        best_step, best_code = good[-1]
        outpath = os.path.join(OUTPUT_DIR, bn)
        with open(outpath, 'w', encoding='utf-8') as out:
            out.write(best_code)
        print(f"RECOVERED {bn}: step={best_step}, size={len(best_code)} -> {outpath}")
    else:
        # Try truncated versions
        any_v = [(s, c) for s, t, c in versions if s < 2700 and len(c) > 200]
        if any_v:
            best_step, best_code = any_v[-1]
            outpath = os.path.join(OUTPUT_DIR, bn)
            with open(outpath, 'w', encoding='utf-8') as out:
                out.write(best_code)
            print(f"RECOVERED (possibly truncated) {bn}: step={best_step}, size={len(best_code)}")
        else:
            print(f"NOT FOUND: {bn} (no versions before step 2700)")

print("\nDone!")
