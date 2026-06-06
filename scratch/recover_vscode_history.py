import os, json, shutil
from datetime import datetime

history_dir = r'C:\Users\9\AppData\Roaming\Code\User\History'
output_dir = r'c:\Users\9\Desktop\meloddyCMS\scratch\recovered_files'
os.makedirs(output_dir, exist_ok=True)

TARGET_FILES = {
    'index.html', 'dashboard.html', 'profile.html', 'settings.html',
    'file-manager.html', 'style.css', 'theme.js', 'theme-v2.js',
    'dashboard.js', 'dashboard_v2.js', 'utils.js', 'login.html',
    'visual-editor.html', 'docs.html', 'landing.css', 'sites.js',
    'db.js', 'profile.js', 'toast.js',
}

# 4 hours ago from now (UTC)
import time
four_hours_ago = (time.time() - 4*3600) * 1000  # milliseconds

found_files = {}

for subdir in os.listdir(history_dir):
    subdir_path = os.path.join(history_dir, subdir)
    entries_path = os.path.join(subdir_path, 'entries.json')
    if not os.path.isfile(entries_path):
        continue
    try:
        with open(entries_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except:
        continue
    
    resource = data.get('resource', '')
    if 'meloddyCMS' not in resource:
        continue
    
    basename = resource.split('/')[-1]
    if basename not in TARGET_FILES:
        continue
    
    entries = data.get('entries', [])
    if not entries:
        continue
    
    # Find the entry closest to 4 hours ago (but not newer)
    best_entry = None
    best_ts = 0
    latest_entry = None
    latest_ts = 0
    
    for e in entries:
        ts = e.get('timestamp', 0)
        eid = e.get('id', '')
        epath = os.path.join(subdir_path, eid)
        if not os.path.exists(epath):
            continue
        fsize = os.path.getsize(epath)
        if fsize < 100:
            continue
        
        if ts > latest_ts:
            latest_ts = ts
            latest_entry = (epath, ts, fsize)
        
        # Want the latest version that is older than ~4 hours ago
        if ts <= four_hours_ago and ts > best_ts:
            best_ts = ts
            best_entry = (epath, ts, fsize)
    
    if best_entry:
        path, ts, size = best_entry
        dt = datetime.fromtimestamp(ts / 1000)
        print(f"FOUND {basename}: {size}B from {dt}, path={path}")
        found_files[basename] = best_entry
    elif latest_entry:
        path, ts, size = latest_entry
        dt = datetime.fromtimestamp(ts / 1000)
        print(f"FALLBACK {basename}: {size}B from {dt} (latest available)")
        found_files[basename] = latest_entry
    
    # Print all versions for debugging
    print(f"  All versions of {basename}:")
    for e in sorted(entries, key=lambda x: x.get('timestamp', 0)):
        ts = e.get('timestamp', 0)
        eid = e.get('id', '')
        epath = os.path.join(subdir_path, eid)
        if os.path.exists(epath):
            fsize = os.path.getsize(epath)
            dt = datetime.fromtimestamp(ts / 1000) if ts else 'unknown'
            print(f"    {dt}: {fsize}B ({eid})")

# Copy recovered files
print(f"\n=== COPYING {len(found_files)} FILES ===")
for basename, (path, ts, size) in found_files.items():
    dst = os.path.join(output_dir, basename)
    shutil.copy2(path, dst)
    dt = datetime.fromtimestamp(ts / 1000)
    print(f"  {basename}: {size}B from {dt} -> {dst}")

print(f"\nDone! Recovered {len(found_files)} files to {output_dir}")
