import json

TRANSCRIPT = r'C:\Users\9\.gemini\antigravity-ide\brain\b4be3967-cdb2-459c-bb1f-03a7d08af446\.system_generated\logs\transcript.jsonl'

f = open(TRANSCRIPT, 'r', encoding='utf-8', errors='ignore')
found = 0
for i, line in enumerate(f):
    if 'write_to_file' not in line:
        continue
    try:
        obj = json.loads(line)
    except:
        continue
    tcs = obj.get('tool_calls', [])
    if not tcs or not isinstance(tcs, list):
        continue
    for tc in tcs:
        if not isinstance(tc, dict):
            continue
        # Try different key patterns
        name = tc.get('name', tc.get('tool_name', ''))
        if 'write_to_file' not in str(name):
            continue
        found += 1
        # Print structure
        print("Step:", obj.get('step_index'))
        print("TC keys:", list(tc.keys()))
        args = tc.get('arguments', tc.get('args', tc.get('input', {})))
        print("Args type:", type(args))
        if isinstance(args, dict):
            print("Args keys:", list(args.keys()))
            tf = args.get('TargetFile', args.get('target_file', ''))
            cc = args.get('CodeContent', args.get('code_content', ''))
            print("TargetFile:", tf[:100] if tf else 'NONE')
            print("CodeContent length:", len(cc) if cc else 'NONE')
        elif isinstance(args, str):
            print("Args string sample:", args[:300])
        print("---")
        if found >= 3:
            break
    if found >= 3:
        break

print("Total found so far:", found)
