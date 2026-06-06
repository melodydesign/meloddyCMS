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
                
            if 'html' in content and 'head' in content and 'meloddyCMS' in content:
                # Count FAQ items
                faq_count = content.count('faq-item')
                feature_count = content.count('feature-card')
                
                # We are looking for something with ~8 cards and ~10 faqs
                if faq_count > 6 or feature_count > 6:
                    candidates.append({
                        'path': file_path,
                        'timestamp': entry.get('timestamp'),
                        'cards': feature_count,
                        'faqs': faq_count,
                        'size': len(content)
                    })
        except:
            continue

# Sort candidates by timestamp descending
candidates.sort(key=lambda x: x['timestamp'], reverse=True)

print(f'Found {len(candidates)} candidates matching HTML with features/faqs.')
for i, c in enumerate(candidates[:20]):
    print(f"{i+1}. {c['path']} | Size: {c['size']} | Features: {c['cards']} | FAQs: {c['faqs']}")
