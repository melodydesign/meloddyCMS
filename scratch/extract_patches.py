import json, os

TRANSCRIPT = r'C:\Users\9\.gemini\antigravity-ide\brain\b4be3967-cdb2-459c-bb1f-03a7d08af446\.system_generated\logs\transcript.jsonl'
OUTPUT_DIR = r'c:\Users\9\Desktop\meloddyCMS\scratch\patches'
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Extract full patch data for key files
KEY_FILES = {'index.html', 'dashboard.html', 'dashboard_v2.js', 'file-manager.html', 
             'style.css', 'settings.html', 'profile.html', 'theme.js', 'docs.html'}

with open(TRANSCRIPT, 'r', encoding='utf-8', errors='ignore') as f:
    for line in f:
        if 'replace_file_content' not in line:
            continue
        try:
            obj = json.loads(line)
        except:
            continue
        step = obj.get('step_index', 0)
        for tc in obj.get('tool_calls', []):
            if not isinstance(tc, dict):
                continue
            name = tc.get('name', '')
            if name not in ('replace_file_content', 'multi_replace_file_content'):
                continue
            args = tc.get('args', {})
            target = args.get('TargetFile', '').strip('"').replace('\\\\', '\\')
            basename = target.replace('\\', '/').split('/')[-1]
            
            if basename not in KEY_FILES:
                continue
            
            # Save full args as JSON for manual inspection
            outpath = os.path.join(OUTPUT_DIR, f'step_{step}_{basename}.json')
            with open(outpath, 'w', encoding='utf-8') as out:
                json.dump({
                    'step': step,
                    'tool': name,
                    'file': basename,
                    'target': target,
                    'args': args
                }, out, indent=2, ensure_ascii=False)
            
            # Also print summary
            if name == 'replace_file_content':
                tc_val = args.get('TargetContent', '')
                rc_val = args.get('ReplacementContent', '')
                trunc_tc = '<truncated' in tc_val if tc_val else False
                trunc_rc = '<truncated' in rc_val if rc_val else False
                print(f"step={step} {basename}: TC={len(tc_val)}B(trunc={trunc_tc}) RC={len(rc_val)}B(trunc={trunc_rc})")
            else:
                chunks = args.get('ReplacementChunks', [])
                if isinstance(chunks, list):
                    for i, chunk in enumerate(chunks):
                        if isinstance(chunk, dict):
                            tc_val = chunk.get('TargetContent', '')
                            rc_val = chunk.get('ReplacementContent', '')
                            trunc_tc = '<truncated' in tc_val if tc_val else False
                            trunc_rc = '<truncated' in rc_val if rc_val else False
                            print(f"step={step} {basename} chunk{i}: TC={len(tc_val)}B(trunc={trunc_tc}) RC={len(rc_val)}B(trunc={trunc_rc})")
                    if not chunks:
                        print(f"step={step} {basename}: multi_replace with EMPTY chunks (truncated)")
                else:
                    print(f"step={step} {basename}: chunks is {type(chunks)}")

print("\nPatches saved to scratch/patches/")
