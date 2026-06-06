import json, os, re

log_path = r'C:\Users\9\.gemini\antigravity-ide\brain\b4be3967-cdb2-459c-bb1f-03a7d08af446\.system_generated\logs\transcript.jsonl'
res = {}

for line in open(log_path, 'r', encoding='utf-8'):
    try:
        obj = json.loads(line)
        if 'content' in obj and 'File Path: ' in obj['content'] and 'Showing lines 1 to ' in obj['content']:
            txt = obj['content']
            path_part = txt.split('File Path: `')[1].split('`')[0]
            path = path_part.replace('\\\\', '/').replace('\\', '/').split('/')[-1]
            
            if path.endswith('.html'):
                content_start = txt.find('Showing lines 1 to')
                content_start = txt.find('\n', content_start) + 1
                actual_content = txt[content_start:]
                
                lines = actual_content.split('\n')
                cleaned_lines = []
                for l in lines:
                    if l.startswith('The following code has been modified'): continue
                    if l.startswith('The above content does NOT show'): continue
                    if l.startswith('The above content shows the entire'): continue
                    
                    m = re.match(r'^\d+:\s?(.*)$', l)
                    if m:
                        cleaned_lines.append(m.group(1))
                    elif l.strip() == '':
                        # could be empty line at the end
                        continue
                    else:
                        cleaned_lines.append(l) # fallback
                
                final_content = '\n'.join(cleaned_lines)
                
                if path not in res or len(final_content) > len(res[path]):
                    res[path] = final_content
    except Exception as e:
        pass

for p, c in res.items():
    if len(c) > 100: # ensure it's not a truncated fragment
        with open('public/' + p, 'w', encoding='utf-8') as f:
            f.write(c)

print("Recovered files to public/: " + ", ".join(res.keys()))
