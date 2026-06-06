import os

file_path = r"c:\Users\9\Desktop\meloddyCMS\public\css\style.css"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Мы ищем первое вхождение битых скелетонов:
broken_str = "/ *   S k e l e t o n s   * /"
dropdown_str = ".custom-dropdown-header:hover"

if broken_str in content and dropdown_str in content:
    start_idx = content.find(broken_str)
    end_idx = content.find(dropdown_str)
    
    if start_idx != -1 and end_idx != -1 and start_idx < end_idx:
        cleaned_content = content[:start_idx] + content[end_idx:]
        
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(cleaned_content)
        print("Successfully cleaned broken styles!")
    else:
        print("Indices not found or in wrong order")
else:
    print("Tokens not found in style.css")
