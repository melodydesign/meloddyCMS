import os
import re

# 1. Update style.css to fix .btn-outline specificity
f = 'public/css/style.css'
with open(f, 'r', encoding='utf-8') as file:
    content = file.read()

# Change `.btn-outline:hover` to `button.btn-outline:hover:not(:disabled), .btn-outline:hover`
if 'button.btn-outline:hover:not(:disabled)' not in content:
    content = content.replace('.btn-outline:hover {', 'button.btn-outline:hover:not(:disabled), .btn-outline:hover {')

# Add missing style for faq-card
if '.faq-card' not in content:
    content += """
.faq-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    padding: 1.5rem;
    border-radius: var(--radius-md);
    margin-bottom: 1rem;
}
.faq-card h4 {
    margin-bottom: 0.5rem;
    color: var(--text-main);
}
.faq-card p {
    color: var(--text-muted);
}
"""

with open(f, 'w', encoding='utf-8') as file:
    file.write(content)


# 2. Update dashboard_v2.js for client tab color
f = 'public/js/dashboard_v2.js'
with open(f, 'r', encoding='utf-8') as file:
    content = file.read()

# Fix active/inactive color for client tab
content = content.replace("tab.style.color = index === 0 ? '#FFFFFF' : 'rgba(255, 255, 255, 0.7)';", "tab.style.color = index === 0 ? 'var(--text-main)' : 'var(--text-muted)';")
content = content.replace("tab.style.color = '#FFFFFF';", "tab.style.color = 'var(--text-main)';")
content = content.replace("tab.style.color = 'rgba(255, 255, 255, 0.7)';", "tab.style.color = 'var(--text-muted)';")

with open(f, 'w', encoding='utf-8') as file:
    file.write(content)


# 3. Update docs.html to change FAQ backgrounds to be more visible
f = 'public/docs.html'
with open(f, 'r', encoding='utf-8') as file:
    content = file.read()

# Make question blocks visible in light theme
content = content.replace('background: #111112;', 'background: var(--bg-card); border: 1px solid var(--border);')
content = content.replace('background: var(--bg-hover);', 'background: var(--bg-card); border: 1px solid var(--border);')
# Remove inline hardcoded colors if any
content = re.sub(r'color:\s*(?:#ccc|#fff|#f1f5f9|#FFFFFF|#CCCCCC);', 'color: var(--text-muted);', content)

with open(f, 'w', encoding='utf-8') as file:
    file.write(content)

# 4. Add padding bottom to file manager
f = 'public/file-manager.html'
with open(f, 'r', encoding='utf-8') as file:
    content = file.read()

# Fix padding-bottom of file list
if '.file-list {' in content:
    content = content.replace('.file-list {', '.file-list {\n            padding-bottom: 2rem;')

with open(f, 'w', encoding='utf-8') as file:
    file.write(content)

print("Fixes applied successfully")
