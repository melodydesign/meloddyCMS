import os
import glob

html_files = glob.glob('public/*.html')

for file_path in html_files:
    if os.path.isdir(file_path):
        continue
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        new_content = content.replace('style.css?v=9', 'style.css?v=10')
        
        if content != new_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(new_content)
            print(f"Updated: {file_path}")
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
