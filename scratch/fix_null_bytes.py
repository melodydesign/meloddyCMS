file_path = r"c:\Users\9\Desktop\meloddyCMS\public\css\style.css"

with open(file_path, "rb") as f:
    data = f.read()

# Удаляем все null-байты
cleaned_data = data.replace(b"\x00", b"")

# Декодируем как UTF-8
text = cleaned_data.decode("utf-8")

# Теперь найдем дубликаты в тексте, если они есть.
# Новые стили выпадающего меню были добавлены в конец, но из-за дублирования они могли повториться.
# Давайте просто запишем чистый текст обратно.
with open(file_path, "w", encoding="utf-8", newline="\n") as f:
    f.write(text)

print("Removed all null bytes successfully!")
