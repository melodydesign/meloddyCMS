import json
with open(r'C:\Users\9\.gemini\antigravity-ide\brain\b4be3967-cdb2-459c-bb1f-03a7d08af446\.system_generated\logs\transcript.jsonl', 'r', encoding='utf-8', errors='ignore') as f:
    for line in f:
        if 'recover.py' in line:
            try:
                obj = json.loads(line)
                step = obj.get('step_index')
                for tc in obj.get('tool_calls', []):
                    args = tc.get('args', tc.get('arguments', {}))
                    tf = args.get('TargetFile', '')
                    if 'recover.py' in tf:
                        print(f"Step {step}:")
                        print(args.get("CodeContent", "")[:800])
            except: pass
