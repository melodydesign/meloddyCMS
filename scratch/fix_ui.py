import os
import re

# 1. Update dashboard.html for button visibility
f = 'public/dashboard.html'
with open(f, 'r', encoding='utf-8') as file:
    content = file.read()

# Fix "Менеджер файлов" button
content = re.sub(
    r'class="btn"\s+style="([^"]*)background:\s*var\(--bg-hover\);\s*color:\s*var\(--text-main\);([^"]*)"',
    r'class="btn btn-secondary" style="\1\2"',
    content
)

# Fix "Удалить сайт" button
content = re.sub(
    r'id="deleteSiteBtn" class="btn"',
    r'id="deleteSiteBtn" class="btn btn-danger"',
    content
)

# Fix developer tools "Сохранить" and "Перенести" buttons
content = re.sub(
    r'id="saveTemplateBtn" class="btn"\s+style="([^"]*)background:\s*var\(--bg-hover\);\s*color:\s*var\(--text-main\);([^"]*)"',
    r'id="saveTemplateBtn" class="btn btn-secondary" style="\1\2"',
    content
)

content = re.sub(
    r'id="transferSiteBtn" class="btn"\s+style="([^"]*)background:\s*var\(--bg-hover\);\s*color:\s*var\(--text-main\);([^"]*)"',
    r'id="transferSiteBtn" class="btn btn-secondary" style="\1\2"',
    content
)

with open(f, 'w', encoding='utf-8') as file:
    file.write(content)

# 2. Update style.css to add .btn-secondary
f = 'public/css/style.css'
with open(f, 'r', encoding='utf-8') as file:
    content = file.read()

if '.btn-secondary' not in content:
    btn_secondary_css = """
.btn-secondary {
    background: var(--bg-hover) !important;
    color: var(--text-main) !important;
    border: 1px solid var(--border) !important;
}
.btn-secondary:hover {
    background: var(--border) !important;
    color: var(--text-main) !important;
}
"""
    content = content.replace('/* Hero Card', btn_secondary_css + '\n/* Hero Card')

with open(f, 'w', encoding='utf-8') as file:
    file.write(content)

# 3. Update dashboard_v2.js for popup position (prevent cut-off)
f = 'public/js/dashboard_v2.js'
with open(f, 'r', encoding='utf-8') as file:
    content = file.read()

content = content.replace('z-index: 10;', 'z-index: 9999;')

# We'll also make sure it uses transform to not go off-screen if it's near bottom
# Since it's a grid, if the popup is at the very bottom, it might overflow.
# But wait, we can just ensure sitesContainer has padding-bottom so there's scroll space.
# Actually, the user says "передвинь всплывашку", maybe we just change top: 100% to top: 30px?
# "position: absolute; right: 0; top: 100%;"
content = content.replace(
    'position: absolute; right: 0; top: 100%;',
    'position: absolute; right: 0; top: 40px;'
)

with open(f, 'w', encoding='utf-8') as file:
    file.write(content)

# 4. Update file-manager.html for 100vh
f = 'public/file-manager.html'
with open(f, 'r', encoding='utf-8') as file:
    content = file.read()

if 'html, body { height: 100vh;' not in content:
    css_to_add = """
    <style>
        html, body { height: 100vh; overflow: hidden; margin: 0; }
        .app-layout { height: 100vh; overflow: hidden; }
        .main-content { overflow: hidden; display: flex; flex-direction: column; padding-bottom: 0; }
        .dashboard-container { flex: 1; display: flex; flex-direction: column; overflow: hidden; padding-bottom: 0; }
        .fm-container { flex: 1; min-height: 0; height: auto; }
        .file-editor-area { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        .CodeMirror { height: 100% !important; flex: 1; }
    </style>
"""
    content = content.replace('</head>', css_to_add + '\n</head>')

with open(f, 'w', encoding='utf-8') as file:
    file.write(content)

print("Done")
