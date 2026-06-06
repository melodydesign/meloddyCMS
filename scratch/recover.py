import re
import os

log_path = r'C:\Users\9\.gemini\antigravity-ide\brain\b4be3967-cdb2-459c-bb1f-03a7d08af446\.system_generated\logs\transcript.jsonl'
with open(log_path, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Look for patterns like:
# File Path: `c:/Users/9/Desktop/meloddyCMS/public/dashboard.html`
# Total Lines: ...
# Total Bytes: ...
# Showing lines ...
# <content>
# {"step_index"
# OR matching the jsonl structure manually

res = {}

# Split the file by `{"step_index"`
blocks = content.split('{"step_index"')
for block in blocks:
    if 'File Path: ' in block and 'Showing lines 1 to ' in block:
        # Extract file path
        try:
            path_match = re.search(r'File Path: `([^`]+)`', block)
            if path_match:
                path = path_match.group(1).split('/')[-1].split('\\')[-1]
                if not path.endswith('.html'):
                    continue
                
                # Extract content
                content_match = re.search(r'Showing lines \d+ to \d+\n(.*?)("\}$|",\s*"tool_calls"|",\s*"status")', block, re.DOTALL)
                if content_match:
                    c = content_match.group(1)
                    # The content in JSON string is escaped. We need to unescape it!
                    # Actually, we split by `{"step_index"` but wait, if it was written raw, it's not JSON decoded!
                    # We can use json.loads instead of raw parsing! Let's do it right.
                    pass
        except Exception as e:
            pass

# Let's use json.loads line by line
res_json = {}
for line in open(log_path, 'r', encoding='utf-8', errors='ignore'):
    try:
        import json
        obj = json.loads(line)
        if 'content' in obj and 'File Path: `' in obj['content'] and 'Showing lines 1 to ' in obj['content']:
            txt = obj['content']
            path_match = re.search(r'File Path: `([^`]+)`', txt)
            if path_match:
                path = path_match.group(1).replace('\\', '/').split('/')[-1]
                if path.endswith('.html'):
                    content_start = txt.find('Showing lines 1 to')
                    content_start = txt.find('\n', content_start) + 1
                    actual_content = txt[content_start:]
                    if path not in res_json or len(actual_content) > len(res_json[path]):
                        res_json[path] = actual_content
    except Exception as e:
        pass

if not os.path.exists('public_recovered'):
    os.mkdir('public_recovered')

for p, c in res_json.items():
    with open('public_recovered/' + p, 'w', encoding='utf-8') as f:
        f.write(c)
        
print("Recovered files:", list(res_json.keys()))
