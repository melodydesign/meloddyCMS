import os, json

history_dir = r'C:\Users\9\AppData\Roaming\Code\User\History'

print("Searching VS Code history for meloddyCMS files...")
for subdir in os.listdir(history_dir):
    entries_path = os.path.join(history_dir, subdir, 'entries.json')
    if not os.path.isfile(entries_path): continue
    try:
        with open(entries_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        res = data.get('resource', '')
        if 'meloddyCMS' not in res: continue
        
        basename = res.split('/')[-1]
        if basename in ['index.html', 'dashboard_v2.js', 'profile.html', 'settings.html', 'login.html']:
            print(f"\n--- Found {basename} in {subdir} ---")
            entries = data.get('entries', [])
            for e in entries:
                path = os.path.join(history_dir, subdir, e['id'])
                if os.path.exists(path):
                    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                        c = f.read()
                    ts = e.get('timestamp')
                    print(f"  ID: {e['id']}, Timestamp: {ts}, Size: {len(c)}")
                    if basename == 'index.html':
                        if 'img' in c: print("    Has <img> tags")
                        if 'Анастасия' in c: print("    Has Анастасия")
                    elif basename == 'dashboard_v2.js':
                        if 'quick-action' in c: print("    Has quick-action")
                        if 'quickAction' in c: print("    Has quickAction")
    except Exception as e:
        pass
