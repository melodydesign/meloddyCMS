import glob
import re

files = glob.glob('public/*.html')
for f in files:
    with open(f, 'r', encoding='utf-8', errors='ignore') as file:
        content = file.read()
    
    # Replace dashboard sidebar logo text with img tags
    new_content = re.sub(
        r'(<a href="/dashboard\.html" class="sidebar-logo"[^>]*>)\s*meloddyCMS\s*(</a>)',
        r'\1\n                <img src="/img/logo-white-them.svg" alt="meloddyCMS" style="height: 32px; width: auto; max-width: 100%; display: block;" class="logo-white">\n                <img src="/img/logo-black-them.svg" alt="meloddyCMS" style="height: 32px; width: auto; max-width: 100%; display: none;" class="logo-black">\n            \2',
        content,
        flags=re.DOTALL
    )
    
    # Replace index.html logo text with img tag
    new_content = re.sub(
        r'(<a href="#" class="logo">)\s*meloddyCMS\s*(</a>)',
        r'\1<img src="/img/logo-white-them.svg" alt="meloddyCMS" style="height: 32px;">\2',
        new_content,
        flags=re.DOTALL
    )
    
    if new_content != content:
        with open(f, 'w', encoding='utf-8') as file:
            file.write(new_content)
        print(f'Updated {f}')
