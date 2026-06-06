import re, glob
res_list = []
logs = glob.glob(r'C:\Users\9\.gemini\antigravity-ide\brain\*\.system_generated\logs\transcript.jsonl')
for log_path in logs:
    with open(log_path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
    
    # Search for write_to_file with index.html
    matches = re.findall(r'"name":"write_to_file","arguments":\{[^}]*?"TargetFile":"[^"]*?index\.html".*?"CodeContent":"(.*?)"', content)
    if matches:
        res_list.append(matches[-1])

if res_list:
    res = res_list[-1]
    res = res.replace('\\n', '\n').replace('\\"', '"').replace('\\\\', '\\')
    with open('public/index.html', 'w', encoding='utf-8') as f:
        f.write(res)
    print('Recovered index.html from write_to_file, length:', len(res))
else:
    print('Not found with write_to_file regex')

    # Try multi_replace_file_content full replace pattern
    res2_list = []
    for log_path in logs:
        with open(log_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        matches = re.findall(r'"name":"multi_replace_file_content","arguments":\{[^}]*?"TargetFile":"[^"]*?index\.html".*?"ReplacementContent":"(<!DOCTYPE html>.*?)"', content, re.IGNORECASE)
        if matches:
            res2_list.append(matches[-1])
            
    if res2_list:
        res = res2_list[-1]
        res = res.replace('\\n', '\n').replace('\\"', '"').replace('\\\\', '\\')
        with open('public/index.html', 'w', encoding='utf-8') as f:
            f.write(res)
        print('Recovered index.html from multi_replace_file_content, length:', len(res))
    else:
        print('Not found with multi_replace regex')
