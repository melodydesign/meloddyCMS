import os, json, glob

brain_dir = r'C:\Users\9\.gemini\antigravity-ide\brain'
transcripts = glob.glob(os.path.join(brain_dir, '*', '.system_generated', 'logs', 'transcript.jsonl'))

candidates_index = []
candidates_login = []

for t_path in transcripts:
    conv_id = os.path.basename(os.path.dirname(os.path.dirname(os.path.dirname(t_path))))
    try:
        with open(t_path, 'r', encoding='utf-8') as f:
            for line in f:
                try:
                    step = json.loads(line)
                except:
                    continue
                    
                if step.get('source') == 'MODEL' and 'tool_calls' in step:
                    for tc in step['tool_calls']:
                        if tc['name'] == 'write_to_file' or tc['name'] == 'replace_file_content':
                            args = tc.get('args', {})
                            if not args: continue
                            
                            target = args.get('TargetFile', '')
                            content = args.get('CodeContent', '') or args.get('ReplacementContent', '')
                            
                            if 'index.html' in target and len(content) > 10000:
                                candidates_index.append({
                                    'conv': conv_id,
                                    'time': step.get('created_at'),
                                    'size': len(content),
                                    'cards': content.count('land-card') or content.count('feature-card'),
                                    'faqs': content.count('faq-item')
                                })
                            if 'login.html' in target and len(content) > 1000:
                                candidates_login.append({
                                    'conv': conv_id,
                                    'time': step.get('created_at'),
                                    'size': len(content)
                                })
    except:
        pass

print("Top 10 index.html candidates:")
candidates_index.sort(key=lambda x: x.get('time', ''), reverse=True)
for c in candidates_index[:10]:
    print(c)

print("\nTop 10 login.html candidates:")
candidates_login.sort(key=lambda x: x.get('time', ''), reverse=True)
for c in candidates_login[:10]:
    print(c)
