import re

file_path = r"c:\Users\9\Desktop\meloddyCMS\public\css\style.css"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Шаг 1: Нормализуем null-байты во всем файле, если они где-то остались
content = content.replace("\x00", "")

# Шаг 2: Найдем границы битого блока
# Он идет после "button.client-tab-btn:hover, button.client-name-btn:hover {\n    transform: none !important;\n}"
# и заканчивается перед ".custom-dropdown-header:hover"
start_marker = "button.client-tab-btn:hover, button.client-name-btn:hover {\n    transform: none !important;\n}"
end_marker = ".custom-dropdown-header:hover"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    before_part = content[:start_idx + len(start_marker)]
    after_part = content[end_idx:]
    
    # Нормальный CSS для вставки
    skeletons_css = """

/* Skeletons */
@keyframes skeleton-loading {
    0% { background-color: rgba(255, 255, 255, 0.05); }
    50% { background-color: rgba(255, 255, 255, 0.1); }
    100% { background-color: rgba(255, 255, 255, 0.05); }
}

@keyframes skeleton-loading-light {
    0% { background-color: rgba(0, 0, 0, 0.05); }
    50% { background-color: rgba(0, 0, 0, 0.1); }
    100% { background-color: rgba(0, 0, 0, 0.05); }
}

.skeleton {
    animation: skeleton-loading 1.5s infinite ease-in-out;
    border-radius: var(--radius-sm);
}

[data-theme="light"] .skeleton {
    animation: skeleton-loading-light 1.5s infinite ease-in-out;
}

.skeleton-text {
    height: 14px;
    margin-bottom: 8px;
    border-radius: 4px;
}

.skeleton-title {
    height: 20px;
    width: 60%;
    margin-bottom: 12px;
    border-radius: 4px;
}

.skeleton-avatar {
    width: 48px;
    height: 48px;
    border-radius: var(--radius-md);
    flex-shrink: 0;
}

.empty-state-block {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 1.5rem;
    background: var(--bg-card);
    border: 1px dashed var(--border);
    border-radius: var(--radius-lg);
    text-align: center;
}

"""
    content = before_part + skeletons_css + after_part
    print("Successfully replaced broken block!")
else:
    print("Failed to find markers for replacement")

# Шаг 3: Теперь уберем дубликаты в конце файла
# Скелетоны и новые стили уже корректно вставлены в шаге 2.
# Проверим, дублируются ли они в хвосте.
# Хвост файла содержит:
# "/* Skeletons */" во второй раз.
second_skeletons_idx = content.find("/* Skeletons */", start_idx + len(start_marker) + len(skeletons_css))
if second_skeletons_idx != -1:
    content = content[:second_skeletons_idx]
    print("Removed duplicate block at the end of style.css")

with open(file_path, "w", encoding="utf-8", newline="\n") as f:
    f.write(content)
print("Finished!")
