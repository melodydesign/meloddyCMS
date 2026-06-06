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
                
            if 'photo-site-hero' in content or 'photo-site-hero-new' in content:
                # Check for FAQ items
                faq_count = content.count('faq-item')
                feature_count = content.count('feature-card')
                
                # Check for 8 features or 10 FAQs as mentioned by user
                if faq_count >= 8 or feature_count >= 6:
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

print(f'Found {len(candidates)} candidates matching photo-site-hero and features/faqs.')
for i, c in enumerate(candidates[:10]):
    print(f"{i+1}. {c['path']} | Size: {c['size']} | Features: {c['cards']} | FAQs: {c['faqs']}")
