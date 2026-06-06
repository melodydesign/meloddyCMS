target_str = """            <a href="/dashboard.html" class="sidebar-logo" style="display: flex; align-items: center; gap: 8px;">
                <svg viewBox="0 0 24 24" fill="none" stroke="#6c5ce7" stroke-width="2" style="width: 28px; height: 28px; flex-shrink: 0;"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                <span class="logo-text" style="font-weight: 700; font-size: 1.2rem; color: #fff; letter-spacing: -0.03em;"><span>meloddy<span style="color: #6c5ce7">CMS</span></span></span>
            </a>"""

replacement_str = """            <a href="/dashboard.html" class="sidebar-logo">
                <div class="logo-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 28px; height: 28px;"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                </div>
                <span class="logo-text" style="font-weight: 700; font-size: 1.2rem; color: #fff; letter-spacing: -0.03em;"><span>meloddy<span style="color: #6c5ce7">CMS</span></span></span>
            </a>"""

import os
files = ['public/settings.html', 'public/file-manager.html', 'public/docs.html', 'public/admin.html']
for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    if target_str in content:
        content = content.replace(target_str, replacement_str)
        with open(f, 'w', encoding='utf-8') as file:
            file.write(content)
        print(f"Fixed {f}")
    else:
        print(f"Target string not found in {f}")
