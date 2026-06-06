import json, os

TRANSCRIPT = r'C:\Users\9\.gemini\antigravity-ide\brain\b4be3967-cdb2-459c-bb1f-03a7d08af446\.system_generated\logs\transcript.jsonl'
OUTPUT_DIR = r'c:\Users\9\Desktop\meloddyCMS\scratch\recovered_files'
os.makedirs(OUTPUT_DIR, exist_ok=True)

TARGET_BASENAMES = {
    'index.html', 'dashboard.html', 'profile.html', 'settings.html',
    'file-manager.html', 'style.css', 'theme.js', 'theme-v2.js',
    'dashboard.js', 'dashboard_v2.js', 'utils.js', 'login.html',
    'visual-editor.html', 'docs.html', 'landing.css', 'sites.js',
    'db.js', 'profile.js', 'toast.js',
}

# Collect ALL write_to_file with their step index
results = []  # (step, basename, full_target, content_len, truncated, content)

with open(TRANSCRIPT, 'r', encoding='utf-8', errors='ignore') as f:
    for line in f:
        try:
            obj = json.loads(line)
        except:
            continue
        step = obj.get('step_index', 0)
        tcs = obj.get('tool_calls', [])
        if not isinstance(tcs, list):
            continue
        for tc in tcs:
            if not isinstance(tc, dict):
                continue
            name = tc.get('name', '')
            if name != 'write_to_file':
                continue
            args = tc.get('arguments', {})
            if not isinstance(args, dict):
                continue
            target = args.get('TargetFile', '')
            code = args.get('CodeContent', '')
            if not target or not code:
                continue
            # Extract basename
            bn = target.replace('\\', '/').split('/')[-1]
            truncated = 'truncated' in code[-200:] if len(code) > 200 else False
            results.append((step, bn, target, len(code), truncated, code))

print(f"Total write_to_file calls found: {len(results)}")
print()

# Group by basename
from collections import defaultdict
by_file = defaultdict(list)
for step, bn, target, clen, trunc, code in results:
    by_file[bn].append((step, target, clen, trunc, code))

for bn in sorted(by_file.keys()):
    versions = by_file[bn]
    print(f"\n=== {bn} ({len(versions)} versions) ===")
    for step, target, clen, trunc, code in versions:
        marker = "TRUNCATED" if trunc else "OK"
        print(f"  step={step}, size={clen}, {marker}, target={target}")
    
    # Save the latest non-truncated version before step 2700
    good_versions = [(s, c) for s, t, cl, tr, c in versions if not tr and s < 2700 and cl > 200]
    if good_versions:
        best_step, best_code = good_versions[-1]
        outpath = os.path.join(OUTPUT_DIR, bn)
        with open(outpath, 'w', encoding='utf-8') as out:
            out.write(best_code)
        print(f"  >>> RECOVERED from step {best_step} ({len(best_code)} bytes) -> {outpath}")
    else:
        # Try any version before 2700
        any_versions = [(s, c) for s, t, cl, tr, c in versions if s < 2700 and cl > 200]
        if any_versions:
            best_step, best_code = any_versions[-1]
            outpath = os.path.join(OUTPUT_DIR, bn)
            with open(outpath, 'w', encoding='utf-8') as out:
                out.write(best_code)
            print(f"  >>> RECOVERED (possibly truncated) from step {best_step} ({len(best_code)} bytes)")
        else:
            print(f"  >>> NO GOOD VERSION FOUND before step 2700")

print("\n\nDone!")
