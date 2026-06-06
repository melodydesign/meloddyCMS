import json
import re

transcript_path = r'C:\Users\9\.gemini\antigravity-ide\brain\b4be3967-cdb2-459c-bb1f-03a7d08af446\.system_generated\logs\transcript.jsonl'

latest_index = ""
latest_login = ""

with open(transcript_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            step = json.loads(line)
        except:
            continue
            
        if step.get('source') == 'MODEL' and 'tool_calls' in step:
            for tc in step['tool_calls']:
                if tc['name'] == 'write_to_file':
                    args = tc.get('args', {})
                    if not args: continue
                    target = args.get('TargetFile', '')
                    content = args.get('CodeContent', '')
                    
                    if 'index.html' in target:
                        if 'Мгновенный деплой' in content or len(content) > 10000:
                            latest_index = content
                    if 'login.html' in target:
                        latest_login = content

print(f"Index length: {len(latest_index)}")
if latest_index:
    print(f"Index snippets: {latest_index[:200]}")
    
print(f"Login length: {len(latest_login)}")
if latest_login:
    print(f"Login snippets: {latest_login[:200]}")
