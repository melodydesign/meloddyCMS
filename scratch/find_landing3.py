import os, json

history_dir = r'C:\Users\9\AppData\Roaming\Code\User\History'
candidates = []

for subdir in os.listdir(history_dir):
    entries_path = os.path.join(history_dir, subdir, 'entries.json')
    if not os.path.isfile(entries_path): continue
    
    try:
        with open(entries_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except:
        continue
        
    for entry in data.get('entries', []):
        file_id = entry.get('id')
        if not file_id: continue
        
        file_path = os.path.join(history_dir, subdir, file_id)
        if not os.path.isfile(file_path): continue
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            if 'Мгновенный деплой' in content or 'Monaco Editor с подсветкой синтаксиса' in content:
                candidates.append({
                    'path': file_path,
                    'timestamp': entry.get('timestamp'),
                    'size': len(content)
                })
        except:
            continue

candidates.sort(key=lambda x: x['timestamp'], reverse=True)
print(f'Found {len(candidates)} candidates matching text.')
for i, c in enumerate(candidates[:20]):
    print(f"{i+1}. {c['path']} | Size: {c['size']} | Time: {c['timestamp']}")
