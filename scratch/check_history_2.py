import os, json

history_dir = r'C:\Users\9\AppData\Roaming\Code\User\History'
print("Checking history...")
for subdir in os.listdir(history_dir):
    entries_path = os.path.join(history_dir, subdir, 'entries.json')
    if not os.path.isfile(entries_path): continue
    try:
        with open(entries_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        res = data.get('resource', '').lower()
        if 'meloddycms' in res:
            basename = res.split('/')[-1]
            print(f"FOUND {basename} in {subdir}")
            for e in data.get('entries', []):
                ts = e.get('timestamp')
                path = os.path.join(history_dir, subdir, e['id'])
                sz = os.path.getsize(path) if os.path.exists(path) else 0
                print(f"  ts={ts}, size={sz}")
    except: pass
