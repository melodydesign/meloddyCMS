import glob

files = glob.glob('public/*.html')
for f in files:
    if f.endswith('index.html') or f.endswith('login.html') or f.endswith('register.html') or f.endswith('profile.html'): 
        continue
    with open(f, 'r', encoding='utf-8', errors='ignore') as file:
        content = file.read()
    
    new_content = content
    if 'href="/profile.html"' in new_content:
        idx = new_content.find('<a href="/profile.html"')
        if idx != -1:
            end_idx = new_content.find('</a>', idx)
            if end_idx != -1:
                new_content = new_content[:idx] + new_content[end_idx+4:]
    
    new_content = new_content.replace('Настройки\n                </a>', 'Профиль и настройки\n                </a>')
    new_content = new_content.replace('Настройки</a>', 'Профиль и настройки</a>')
    
    if new_content != content:
        with open(f, 'w', encoding='utf-8') as file:
            file.write(new_content)
        print(f'Updated {f}')
